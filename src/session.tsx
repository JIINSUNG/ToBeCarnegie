// 앱 전체의 잠금 상태 관리.
// Vault는 하나의 랜덤 "마스터 키"로만 암복호화된다. 패스프레이즈는 그 마스터 키를 감싸는(wrap)
// KEK일 뿐이라, 잠금 방법을 늘려도 Vault를 다시 암호화할 필요가 없다.
// 마스터 키와 복호화된 Vault는 이 안의 React state(메모리)에만 있고, lock()을 부르면 바로 버려진다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PBKDF2_ITERATIONS,
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  exportKeyRaw,
  generateMasterKey,
  importKeyRaw,
  randomSalt,
  saltFromBase64,
  saltToBase64,
  unwrapKey,
  wrapKey,
} from "./lib/crypto";
import { clearStoredVault, loadStoredVault, requestPersistence, saveStoredVault, type PassphraseUnlock, type StoredVault } from "./lib/storage";
import type { CloudVault } from "./lib/sync";
import { createBackupFile, restoreMerge, restoreOverwrite, type BackupFile } from "./lib/backup";
import { mergeVaults } from "./lib/merge";
import { isSyncConfigured } from "./lib/sync-env";
import { consumeSyncRedirectPending } from "./lib/sync-pending";
import { emptyVault, type Vault } from "./types";

// lib/sync.ts는 Firebase SDK 전체를 끌어오므로, 동기화를 실제로 쓸 때만 동적으로 불러온다
// (.env.local 없이 쓰는 대다수 사용자의 번들에 Firebase 코드가 섞여 들어가지 않게).
const loadSync = () => import("./lib/sync");

type Status = "loading" | "needs-setup" | "locked" | "unlocked";
type SyncStatus = "idle" | "syncing" | "success" | "error";

/** 클라우드 문서의 마스터 키가 내 것과 다르면(이 계정으로 처음 합류하는 기기라서), 클라우드 쪽을
 * "이 계정의 진짜 키"로 받아들인다 — 패스프레이즈는 기기마다 달라도 되니, 어느 기기가 먼저
 * 동기화했든 그 기기의 마스터 키로 전부 통일된다. 같으면 같은 객체를 그대로 돌려준다(상태 갱신을
 * 괜히 유발하지 않게). */
async function resolveMasterKey(cloud: CloudVault, current: CryptoKey): Promise<CryptoKey> {
  const currentB64 = await exportKeyRaw(current);
  if (cloud.masterKeyB64 === currentB64) return current;
  return importKeyRaw(cloud.masterKeyB64);
}

/** 마스터 키를 클라우드 쪽으로 갈아탔으면(effectiveKey !== masterKey), 로컬에 저장된 "패스프레이즈로
 * 감싼 키"도 새 마스터 키를 감싸도록 다시 만든다. 이걸 빼먹으면 로컬엔 내용은 새 키로 암호화돼
 * 있는데 감싸진 키는 옛날 키 그대로 남아서, 다음에 암호를 넣으면 그 옛날 키가 풀리고 → 그걸로
 * 새 내용을 복호화하려다 실패해서 "암호가 맞지 않아요"가 뜬다(실제로 암호는 맞았는데). */
async function rewrapIfAdopted(effectiveKey: CryptoKey, masterKey: CryptoKey, wraps: Wraps, kek: CryptoKey): Promise<Wraps> {
  if (effectiveKey === masterKey) return wraps;
  const wrapped = await wrapKey(kek, effectiveKey);
  return { passphrase: { ...wraps.passphrase, iv: wrapped.iv, cipher: wrapped.cipher } };
}

const LAST_SYNCED_KEY = "hr-last-synced-at";

interface Wraps {
  passphrase: PassphraseUnlock;
}

interface SessionValue {
  status: Status;
  vault: Vault | null;
  error: string | null;
  syncConfigured: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  resetDevice: () => Promise<void>;
  update: (fn: (v: Vault) => Vault) => void;
  exportBackup: () => Promise<BackupFile | null>;
  restoreBackup: (file: BackupFile, mode: "merge" | "overwrite") => Promise<boolean>;
  syncNow: (auto?: boolean) => Promise<boolean>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [wraps, setWraps] = useState<Wraps | null>(null);
  // 패스프레이즈에서 뽑은 KEK(이 기기 로컬 전용) — 클라우드에서 다른 마스터 키를 받아들일 때
  // (resolveMasterKey), 그 새 키를 이 기기 암호로 다시 감싸서 로컬에 저장하는 데 필요하다.
  // 평문 패스프레이즈 자체는 저장 안 하고, 파생된 이 키만 메모리에 둔다(잠그면 버려짐).
  const [kek, setKek] = useState<CryptoKey | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_SYNCED_KEY);
      return saved ? Number(saved) : null;
    } catch {
      // localStorage를 못 읽는 환경 — 그냥 "아직 동기화 안 함"으로 보여주면 된다
      return null;
    }
  });
  // "방금 내가 직접 올린 것"의 updatedAt — 실시간 구독이 그걸 메아리로 다시 받았을 때 무시해서
  // 무한 루프를 막는 데 쓴다(syncNow·자동 올리기·실시간 구독 셋이 같이 쓴다).
  const lastSyncedUpdatedAtRef = useRef<number | null>(null);
  // "이 기기에서 사용자가 직접 뭔가 바꿨다"는 표시 — update()에서만 true로 켠다. 실시간 구독이
  // 받아온 걸 merge해서 setVault할 때는 이걸 안 켜서, "다른 기기가 올린 걸 받아서 합친 것뿐인데
  // 내용이 똑같아도 새 타임스탬프로 또 올리고, 그걸 그 기기가 또 받아 합쳐서 또 올리고…"가
  // 무한 반복되는 걸 막는다(실제로 겪은 문제 — 동기화가 끝없이 핑퐁 치면서 느려 보이던 원인).
  const dirtyRef = useRef(false);

  useEffect(() => {
    loadStoredVault().then((stored) => {
      setStatus(stored ? "locked" : "needs-setup");
    });
    // 동기화를 써본 적 있는 기기면, 잠금 화면이 뜨는 동안 미리 동기화용 코드(Firebase SDK 묶음)를
    // 백그라운드로 받아둔다 — 그래야 막상 잠금을 풀고 동기화가 필요할 때(실시간 구독 시작, "지금
    // 동기화") 그제서야 네트워크로 받아오느라 첫 동기화가 유독 느린 일이 없다.
    if (isSyncConfigured()) {
      try {
        if (localStorage.getItem(LAST_SYNCED_KEY)) void loadSync();
      } catch {
        // localStorage를 못 읽는 환경 — 미리 받아두기만 못 할 뿐 기능엔 지장 없다
      }
    }
  }, []);

  const persist = useCallback(async (nextVault: Vault, mk: CryptoKey, w: Wraps) => {
    const blob = await encryptWithKey(mk, nextVault);
    const stored: StoredVault = { iv: blob.iv, cipher: blob.cipher, updatedAt: Date.now(), passphrase: w.passphrase };
    await saveStoredVault(stored);
  }, []);

  const setup = useCallback(
    async (passphrase: string) => {
      const salt = randomSalt();
      const kek = await deriveKey(passphrase, salt);
      const masterKey = await generateMasterKey();
      const wrapped = await wrapKey(kek, masterKey);
      const w: Wraps = { passphrase: { salt: saltToBase64(salt), iterations: PBKDF2_ITERATIONS, iv: wrapped.iv, cipher: wrapped.cipher } };
      const newVault = emptyVault();

      await persist(newVault, masterKey, w);
      await requestPersistence();
      dirtyRef.current = true;
      setMasterKey(masterKey);
      setWraps(w);
      setKek(kek);
      setVault(newVault);
      setError(null);
      setStatus("unlocked");
    },
    [persist]
  );

  const unlockFromStored = useCallback(async (passphrase: string, stored: StoredVault): Promise<boolean> => {
    try {
      const salt = saltFromBase64(stored.passphrase.salt);
      const kek = await deriveKey(passphrase, salt, stored.passphrase.iterations);
      const masterKey = await unwrapKey(kek, { iv: stored.passphrase.iv, cipher: stored.passphrase.cipher });
      const decrypted = await decryptWithKey<Vault>(masterKey, { iv: stored.iv, cipher: stored.cipher });
      setMasterKey(masterKey);
      setWraps({ passphrase: stored.passphrase });
      setKek(kek);
      setVault(decrypted);
      setError(null);
      setStatus("unlocked");
      return true;
    } catch {
      setError("암호가 맞지 않아요.");
      return false;
    }
  }, []);

  const unlock = useCallback(
    async (passphrase: string) => {
      const stored = await loadStoredVault();
      if (!stored) {
        setStatus("needs-setup");
        return false;
      }
      return unlockFromStored(passphrase, stored);
    },
    [unlockFromStored]
  );

  const lock = useCallback(() => {
    setMasterKey(null);
    setWraps(null);
    setKek(null);
    setVault(null);
    setError(null);
    setStatus("locked");
  }, []);

  /** 암호가 기억이 안 나거나(혹은 예전 버그로 로컬 저장이 꼬여서) 계속 "암호가 맞지 않아요"만 뜰
   * 때 쓰는 마지막 수단 — 이 기기의 로컬 기록만 지우고 새로 시작한다. 동기화를 켜둔 사람은 그 뒤에
   * "지금 동기화"를 누르면 클라우드에 있던 내용을 그대로 받아올 수 있다(클라우드 쪽은 안 건드림). */
  const resetDevice = useCallback(async () => {
    await clearStoredVault();
    setMasterKey(null);
    setWraps(null);
    setKek(null);
    setVault(null);
    setError(null);
    setStatus("needs-setup");
  }, []);

  const update = useCallback(
    (fn: (v: Vault) => Vault) => {
      setVault((prev) => {
        if (!prev || !masterKey || !wraps) return prev;
        const next = fn(prev);
        dirtyRef.current = true;
        void persist(next, masterKey, wraps);
        return next;
      });
    },
    [masterKey, wraps, persist]
  );

  const exportBackup = useCallback(async (): Promise<BackupFile | null> => {
    if (!vault || !masterKey || !wraps) return null;
    const now = Date.now();
    const nextVault: Vault = { ...vault, lastBackupAt: now };
    const blob = await encryptWithKey(masterKey, nextVault);
    const stored: StoredVault = { iv: blob.iv, cipher: blob.cipher, updatedAt: now, passphrase: wraps.passphrase };
    await saveStoredVault(stored);
    dirtyRef.current = true;
    setVault(nextVault);
    return createBackupFile(stored);
  }, [vault, masterKey, wraps]);

  const restoreBackup = useCallback(
    async (file: BackupFile, mode: "merge" | "overwrite"): Promise<boolean> => {
      if (!masterKey) return false;
      try {
        const decrypted = await decryptWithKey<Vault>(masterKey, { iv: file.vault.iv, cipher: file.vault.cipher });
        update((v) => (mode === "merge" ? restoreMerge(v, decrypted) : restoreOverwrite(decrypted)));
        setError(null);
        return true;
      } catch {
        setError("이 백업을 열 수 없어요. (다른 기기/암호로 만든 백업인가요?)");
        return false;
      }
    },
    [masterKey, update]
  );

  /** 파이어베이스가 돌려주는 에러에서 사람이 읽을 수 있는 이유를 뽑아낸다 — "동기화에 실패했어요"
   * 한 줄만으로는 로그인 팝업 문제인지, 도메인이 안 걸려 있는 건지, 권한 문제인지 구분이 안 돼서
   * 원인 코드를 같이 보여준다. */
  function syncFailureReason(err: unknown): string {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    if (code === "auth/unauthorized-domain") return "이 주소(도메인)가 파이어베이스에 허용돼 있지 않아요. (파이어베이스 콘솔 > Authentication > Settings > 승인된 도메인)";
    if (code === "auth/popup-blocked") return "로그인 팝업이 브라우저에 막혔어요. 팝업 차단을 풀고 다시 시도해주세요.";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "로그인 창을 닫아서 취소됐어요.";
    if (code === "permission-denied") return "권한이 없어요. (다른 계정으로 로그인했거나 보안 규칙 문제일 수 있어요)";
    if (code === "auth/timeout") return "로그인 창이 너무 오래 떠 있었어요. 팝업을 닫고 다시 시도해주세요. (팝업이 아예 안 떴다면 브라우저가 막았을 수 있어요)";
    if (code === "auth/redirect-in-progress") return "구글 로그인 화면으로 이동할게요. 로그인하고 돌아오면 다시 '지금 동기화'를 눌러주세요.";
    if (code === "auth/redirect-failed")
      return "이 앱 화면에서는 구글 로그인이 잘 안 되는 것 같아요. 브라우저(Safari/Chrome)로 열어서 동기화해보세요.";
    if (code === "invalid-argument") return "저장하는 데이터에 문제가 있었어요. 앱을 새로고침한 뒤 다시 시도해주세요.";
    // 인터넷 연결 자체가 끊겨 있으면 code가 "0"처럼 의미 없는 값으로 오는 경우가 많다(파이어베이스
    // 고유 코드가 아니라 브라우저/네트워크 계층에서 온 에러라서) — 이게 가장 흔하고 확인하기도
    // 쉬우니 먼저 짚어준다.
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "인터넷 연결이 끊겨 있어요. 연결을 확인하고 다시 시도해주세요.";
    // 알려진 파이어베이스 코드가 아니면("0" 같은 숫자 등) code보다 message/name이 더 쓸모 있다.
    const detail =
      typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : typeof err === "object" && err !== null && "name" in err
          ? String((err as { name: unknown }).name)
          : code;
    if (detail) return `동기화에 실패했어요. (${detail})`;
    return "동기화에 실패했어요. (다른 기기와 다른 암호로 시작했을 수 있어요)";
  }

  /** 지금 들고 있는 Vault를 클라우드와 맞춘다: 받아온 내용과 항목별 최신 우선으로 합친 뒤 다시 올린다.
   * auto=true면(리다이렉트 복귀 후 자동 재개) 로그인이 아직 안 돼 있어도 또 리다이렉트하지
   * 않는다 — 안 그러면 일부 환경에서 리다이렉트→앱→리다이렉트 무한 루프가 될 수 있다. */
  const syncNow = useCallback(
    async (auto = false): Promise<boolean> => {
      if (!vault || !masterKey || !wraps || !kek) return false;
      setSyncStatus("syncing");
      try {
        const { signInOwner, pullStoredVault, pushStoredVault } = await loadSync();
        // 로그인 팝업을 닫지 않고 방치하면(또는 팝업이 막혀서 안 뜨면) signInWithPopup이 영영 안
        // 끝나서, "동기화 중…"이 그대로 멈춰버린("먹통") 것처럼 보인다 — 45초 넘으면 포기하고 에러로 보여준다.
        const uid = await Promise.race([
          signInOwner(!auto),
          new Promise<never>((_, reject) => setTimeout(() => reject({ code: "auth/timeout" }), 45000)),
        ]);
        const cloud = await pullStoredVault(uid);
        let effectiveKey = masterKey;
        let finalVault = vault;
        if (cloud) {
          // 이 계정으로 처음 합류하는 기기면(내 패스프레이즈로 감싼 로컬 키와 클라우드 키가
          // 다르면), 클라우드 쪽 키로 갈아탄다 — 패스프레이즈를 안 맞춰도 합류되는 이유.
          effectiveKey = await resolveMasterKey(cloud, masterKey);
          const remoteVault = await decryptWithKey<Vault>(effectiveKey, { iv: cloud.iv, cipher: cloud.cipher });
          finalVault = mergeVaults(vault, remoteVault);
        }
        const effectiveWraps = await rewrapIfAdopted(effectiveKey, masterKey, wraps, kek);
        await persist(finalVault, effectiveKey, effectiveWraps);
        if (effectiveKey !== masterKey) setMasterKey(effectiveKey);
        if (effectiveWraps !== wraps) setWraps(effectiveWraps);
        setVault(finalVault);
        const blob = await encryptWithKey(effectiveKey, finalVault);
        const masterKeyB64 = await exportKeyRaw(effectiveKey);
        const now = Date.now();
        lastSyncedUpdatedAtRef.current = now;
        await pushStoredVault(uid, { iv: blob.iv, cipher: blob.cipher, updatedAt: now, masterKeyB64 });
        dirtyRef.current = false;
        setError(null);
        setSyncStatus("success");
        setLastSyncedAt(now);
        try {
          localStorage.setItem(LAST_SYNCED_KEY, String(now));
        } catch {
          // 시크릿 모드 등 localStorage를 못 쓰는 환경 — 다음 동기화까지만 메모리에 남아도 괜찮다
        }
        return true;
      } catch (err) {
        setError(syncFailureReason(err));
        setSyncStatus("error");
        return false;
      }
    },
    [vault, masterKey, wraps, kek, persist]
  );

  // PWA에서 리다이렉트로 로그인만 하고 돌아왔을 때(lib/sync.ts가 markSyncRedirectPending로 남겨둔
  // 표시), 잠금을 풀자마자 동기화(받아오기·올리기)까지 자동으로 마저 한다 — 안 그러면 "동기화"
  // 버튼을 한 번 더 눌러야 한다는 걸 몰라서 데이터가 안 맞춰진 것처럼 보인다. 이미 로그인된 상태로
  // 다시 들어온 보통의 경우는 아래 실시간 구독/자동 올리기가 대신 처리한다.
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);
  useEffect(() => {
    if (status !== "unlocked" || !isSyncConfigured() || !consumeSyncRedirectPending()) return;
    const timer = setTimeout(() => void syncNowRef.current(true), 0);
    return () => clearTimeout(timer);
  }, [status]);

  // 로그인된 상태로 쓰는 동안은 클라우드 문서를 실시간 구독해서, 다른 기기가 올린 내용이 거의
  // 바로 반영되게 한다. updatedAt을 기억해뒀다가 "방금 내가 직접 올린 것"이 메아리처럼 다시
  // 돌아오는 건 무시해서(무한 루프 방지), 다른 기기가 올린 진짜 변경만 받아 합친다.
  useEffect(() => {
    if (status !== "unlocked" || !isSyncConfigured() || !masterKey || !wraps || !kek) return;
    const unsubRef: { current: (() => void) | undefined } = { current: undefined };
    const cancelledRef = { current: false };
    void (async () => {
      const { getCurrentUid, subscribeStoredVault } = await loadSync();
      const uid = await getCurrentUid();
      if (!uid || cancelledRef.current) return;
      unsubRef.current = subscribeStoredVault(uid, (cloud) => {
        if (!cloud || cloud.updatedAt === lastSyncedUpdatedAtRef.current) return;
        void (async () => {
          try {
            const effectiveKey = await resolveMasterKey(cloud, masterKey);
            const remoteVault = await decryptWithKey<Vault>(effectiveKey, { iv: cloud.iv, cipher: cloud.cipher });
            const effectiveWraps = await rewrapIfAdopted(effectiveKey, masterKey, wraps, kek);
            lastSyncedUpdatedAtRef.current = cloud.updatedAt;
            if (effectiveKey !== masterKey) setMasterKey(effectiveKey);
            if (effectiveWraps !== wraps) setWraps(effectiveWraps);
            setVault((prev) => {
              if (!prev) return prev;
              const merged = mergeVaults(prev, remoteVault);
              void persist(merged, effectiveKey, effectiveWraps);
              return merged;
            });
            setLastSyncedAt(Date.now());
          } catch {
            // 복호화가 안 되는 등 — 실시간 구독 중에 매번 에러를 띄우면 거슬리니 조용히 넘어간다.
            // 수동 "지금 동기화"를 누르면 그때 에러가 뜬다.
          }
        })();
      });
    })();
    return () => {
      cancelledRef.current = true;
      unsubRef.current?.();
    };
  }, [status, masterKey, wraps, kek, persist]);

  // 로컬에서 바뀐 내용은 잠깐(0.8초) 더 안 바뀌면 자동으로 올린다 — 기기마다 "지금 동기화"를 직접
  // 누를 필요 없이 서로 거의 실시간으로 맞춰지게. (예전엔 2초였는데, dirtyRef로 쓸데없는 재전송을
  // 막아둬서 짧게 줄여도 핑퐁이 안 생긴다 — 그만큼 다른 기기에 더 빨리 반영된다.)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (status !== "unlocked" || !isSyncConfigured() || !vault || !masterKey || !wraps) return;
    // 실시간 구독이 다른 기기 내용을 받아 합친 것뿐이면(dirtyRef가 false) 다시 올릴 필요가 없다 —
    // 안 그러면 "받기 → (내용은 그대로인데) 새 타임스탬프로 다시 올리기 → 상대방이 또 받아서 또
    // 올리기"가 끝없이 반복되며 쓸데없는 네트워크 왕복만 계속돼서 동기화가 굼뜨고 어수선해 보인다.
    if (!dirtyRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void (async () => {
        const { getCurrentUid, pushStoredVault } = await loadSync();
        const uid = await getCurrentUid();
        if (!uid) return;
        const blob = await encryptWithKey(masterKey, vault);
        const masterKeyB64 = await exportKeyRaw(masterKey);
        const updatedAt = Date.now();
        lastSyncedUpdatedAtRef.current = updatedAt;
        try {
          await pushStoredVault(uid, { iv: blob.iv, cipher: blob.cipher, updatedAt, masterKeyB64 });
          dirtyRef.current = false;
          setLastSyncedAt(updatedAt);
          try {
            localStorage.setItem(LAST_SYNCED_KEY, String(updatedAt));
          } catch {
            // 시크릿 모드 등 localStorage를 못 쓰는 환경 — 다음 동기화까지만 메모리에 남아도 괜찮다
          }
        } catch {
          // 조용한 백그라운드 자동 올리기라 실패해도 화면에 에러를 안 띄운다 — 다음 변경 때 다시
          // 시도되고, 안 되면 사용자가 "지금 동기화"를 직접 눌러서 원인을 볼 수 있다. dirtyRef는
          // true로 남겨둬서 다음 변경(또는 수동 동기화) 때 다시 시도되게 한다.
        }
      })();
    }, 800);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [vault, status, masterKey, wraps]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      vault,
      error,
      syncConfigured: isSyncConfigured(),
      syncStatus,
      lastSyncedAt,
      setup,
      unlock,
      lock,
      resetDevice,
      update,
      exportBackup,
      restoreBackup,
      syncNow,
    }),
    [status, vault, error, syncStatus, lastSyncedAt, setup, unlock, lock, resetDevice, update, exportBackup, restoreBackup, syncNow]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
