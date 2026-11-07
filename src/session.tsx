// 앱 전체의 잠금 상태 관리.
// Vault는 하나의 랜덤 "마스터 키"로만 암복호화된다. 패스프레이즈·패스키는 전부 그 마스터 키를
// 감싸는(wrap) KEK일 뿐이라, 잠금 방법을 늘려도 Vault를 다시 암호화할 필요가 없다.
// 마스터 키와 복호화된 Vault는 이 안의 React state(메모리)에만 있고, lock()을 부르면 바로 버려진다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PBKDF2_ITERATIONS,
  decryptWithKey,
  deriveKey,
  deriveKeyFromPrf,
  encryptWithKey,
  generateMasterKey,
  randomSalt,
  saltFromBase64,
  saltToBase64,
  unwrapKey,
  wrapKey,
} from "./lib/crypto";
import {
  loadStoredVault,
  requestPersistence,
  saveStoredVault,
  type PasskeyUnlock,
  type PassphraseUnlock,
  type StoredVault,
} from "./lib/storage";
import { registerPasskey as registerPasskeyCredential, unlockWithPasskey } from "./lib/passkey";
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

const LAST_SYNCED_KEY = "hr-last-synced-at";

interface Wraps {
  passphrase: PassphraseUnlock;
  passkey?: PasskeyUnlock;
}

interface SessionValue {
  status: Status;
  vault: Vault | null;
  error: string | null;
  hasPasskey: boolean;
  syncConfigured: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  unlockPasskey: () => Promise<boolean>;
  joinFromCloud: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  update: (fn: (v: Vault) => Vault) => void;
  registerPasskey: (accountName: string) => Promise<boolean>;
  removePasskey: () => void;
  exportBackup: () => Promise<BackupFile | null>;
  restoreBackup: (file: BackupFile, mode: "merge" | "overwrite") => Promise<boolean>;
  syncNow: () => Promise<boolean>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [wraps, setWraps] = useState<Wraps | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
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

  useEffect(() => {
    loadStoredVault().then((stored) => {
      setHasPasskey(!!stored?.passkey);
      setStatus(stored ? "locked" : "needs-setup");
    });
  }, []);

  const persist = useCallback(async (nextVault: Vault, mk: CryptoKey, w: Wraps) => {
    const blob = await encryptWithKey(mk, nextVault);
    const stored: StoredVault = { iv: blob.iv, cipher: blob.cipher, updatedAt: Date.now(), passphrase: w.passphrase, passkey: w.passkey };
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
      setMasterKey(masterKey);
      setWraps(w);
      setVault(newVault);
      setHasPasskey(false);
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
      setWraps({ passphrase: stored.passphrase, passkey: stored.passkey });
      setVault(decrypted);
      setHasPasskey(!!stored.passkey);
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

  /** 다른 기기에서 이미 동기화해둔 Vault가 있을 때, 이 기기는 새로 만들지 않고 그걸 받아 합류한다. */
  const joinFromCloud = useCallback(
    async (passphrase: string): Promise<boolean> => {
      try {
        const { signInOwner, pullStoredVault } = await loadSync();
        const uid = await signInOwner();
        const remote = await pullStoredVault(uid);
        if (!remote) {
          setError("클라우드에 저장된 백업이 아직 없어요.");
          return false;
        }
        const ok = await unlockFromStored(passphrase, remote);
        if (ok) await saveStoredVault(remote);
        return ok;
      } catch {
        setError("클라우드에 연결하지 못했어요. 동기화 설정을 확인해주세요.");
        return false;
      }
    },
    [unlockFromStored]
  );

  const unlockPasskey = useCallback(async () => {
    const stored = await loadStoredVault();
    if (!stored?.passkey) {
      setError("등록된 패스키가 없어요.");
      return false;
    }
    try {
      const prfOutput = await unlockWithPasskey(stored.passkey.credentialId, stored.passkey.prfSalt);
      const kek = await deriveKeyFromPrf(prfOutput);
      const masterKey = await unwrapKey(kek, { iv: stored.passkey.iv, cipher: stored.passkey.cipher });
      const decrypted = await decryptWithKey<Vault>(masterKey, { iv: stored.iv, cipher: stored.cipher });
      setMasterKey(masterKey);
      setWraps({ passphrase: stored.passphrase, passkey: stored.passkey });
      setVault(decrypted);
      setHasPasskey(true);
      setError(null);
      setStatus("unlocked");
      return true;
    } catch {
      setError("패스키로 잠금을 풀지 못했어요.");
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setMasterKey(null);
    setWraps(null);
    setVault(null);
    setError(null);
    setStatus("locked");
  }, []);

  const update = useCallback(
    (fn: (v: Vault) => Vault) => {
      setVault((prev) => {
        if (!prev || !masterKey || !wraps) return prev;
        const next = fn(prev);
        void persist(next, masterKey, wraps);
        return next;
      });
    },
    [masterKey, wraps, persist]
  );

  const registerPasskey = useCallback(
    async (accountName: string): Promise<boolean> => {
      if (!masterKey || !wraps || !vault) return false;
      try {
        const reg = await registerPasskeyCredential(accountName);
        const kek = await deriveKeyFromPrf(reg.prfOutput);
        const wrapped = await wrapKey(kek, masterKey);
        const newWraps: Wraps = {
          ...wraps,
          passkey: { credentialId: reg.credentialId, prfSalt: reg.prfSalt, iv: wrapped.iv, cipher: wrapped.cipher },
        };
        setWraps(newWraps);
        setHasPasskey(true);
        await persist(vault, masterKey, newWraps);
        setError(null);
        return true;
      } catch {
        setError("패스키를 등록하지 못했어요. (이 기기/브라우저가 지원하지 않을 수 있어요)");
        return false;
      }
    },
    [masterKey, wraps, vault, persist]
  );

  const removePasskey = useCallback(() => {
    if (!masterKey || !vault || !wraps) return;
    const next: Wraps = { passphrase: wraps.passphrase };
    setWraps(next);
    setHasPasskey(false);
    void persist(vault, masterKey, next);
  }, [masterKey, vault, wraps, persist]);

  const exportBackup = useCallback(async (): Promise<BackupFile | null> => {
    if (!vault || !masterKey || !wraps) return null;
    const now = Date.now();
    const nextVault: Vault = { ...vault, lastBackupAt: now };
    const blob = await encryptWithKey(masterKey, nextVault);
    const stored: StoredVault = { iv: blob.iv, cipher: blob.cipher, updatedAt: now, passphrase: wraps.passphrase, passkey: wraps.passkey };
    await saveStoredVault(stored);
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
    if (code) return `동기화에 실패했어요. (${code})`;
    return "동기화에 실패했어요. (다른 기기와 다른 암호로 시작했을 수 있어요)";
  }

  /** 지금 들고 있는 Vault를 클라우드와 맞춘다: 받아온 내용과 항목별 최신 우선으로 합친 뒤 다시 올린다. */
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!vault || !masterKey || !wraps) return false;
    setSyncStatus("syncing");
    try {
      const { signInOwner, pullStoredVault, pushStoredVault } = await loadSync();
      // 로그인 팝업을 닫지 않고 방치하면(또는 팝업이 막혀서 안 뜨면) signInWithPopup이 영영 안
      // 끝나서, "동기화 중…"이 그대로 멈춰버린("먹통") 것처럼 보인다 — 45초 넘으면 포기하고 에러로 보여준다.
      const uid = await Promise.race([
        signInOwner(),
        new Promise<never>((_, reject) => setTimeout(() => reject({ code: "auth/timeout" }), 45000)),
      ]);
      const remoteStored = await pullStoredVault(uid);
      let finalVault = vault;
      if (remoteStored) {
        const remoteVault = await decryptWithKey<Vault>(masterKey, { iv: remoteStored.iv, cipher: remoteStored.cipher });
        finalVault = mergeVaults(vault, remoteVault);
      }
      await persist(finalVault, masterKey, wraps);
      setVault(finalVault);
      const blob = await encryptWithKey(masterKey, finalVault);
      await pushStoredVault(uid, { iv: blob.iv, cipher: blob.cipher, updatedAt: Date.now(), passphrase: wraps.passphrase, passkey: wraps.passkey });
      setError(null);
      setSyncStatus("success");
      const now = Date.now();
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
  }, [vault, masterKey, wraps, persist]);

  // PWA에서 리다이렉트로 로그인만 하고 돌아왔을 때(lib/sync.ts가 markSyncRedirectPending로
  // 남겨둔 표시), 잠금을 풀자마자 동기화(받아오기·올리기)까지 자동으로 마저 한다 — 안 그러면
  // "동기화" 버튼을 한 번 더 눌러야 한다는 걸 몰라서 데이터가 안 맞춰진 것처럼 보인다.
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);
  useEffect(() => {
    if (status !== "unlocked" || !isSyncConfigured() || !consumeSyncRedirectPending()) return;
    const timer = setTimeout(() => void syncNowRef.current(), 0);
    return () => clearTimeout(timer);
    // syncNow 자체가 아니라 "잠금이 풀린 순간"에만 반응해야 하므로(안 그러면 vault가 바뀔 때마다
    // syncNow 참조가 새로 생겨 이 effect가 계속 다시 실행된다) status만 의존성으로 둔다.
  }, [status]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      vault,
      error,
      hasPasskey,
      syncConfigured: isSyncConfigured(),
      syncStatus,
      lastSyncedAt,
      setup,
      unlock,
      unlockPasskey,
      joinFromCloud,
      lock,
      update,
      registerPasskey,
      removePasskey,
      exportBackup,
      restoreBackup,
      syncNow,
    }),
    [
      status,
      vault,
      error,
      hasPasskey,
      syncStatus,
      lastSyncedAt,
      setup,
      unlock,
      unlockPasskey,
      joinFromCloud,
      lock,
      update,
      registerPasskey,
      removePasskey,
      exportBackup,
      restoreBackup,
      syncNow,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
