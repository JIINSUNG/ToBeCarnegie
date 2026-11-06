// 앱 전체의 잠금 상태 관리.
// Vault는 하나의 랜덤 "마스터 키"로만 암복호화된다. 패스프레이즈·패스키는 전부 그 마스터 키를
// 감싸는(wrap) KEK일 뿐이라, 잠금 방법을 늘려도 Vault를 다시 암호화할 필요가 없다.
// 마스터 키와 복호화된 Vault는 이 안의 React state(메모리)에만 있고, lock()을 부르면 바로 버려진다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { emptyVault, type Vault } from "./types";

type Status = "loading" | "needs-setup" | "locked" | "unlocked";

interface Wraps {
  passphrase: PassphraseUnlock;
  passkey?: PasskeyUnlock;
}

interface SessionValue {
  status: Status;
  vault: Vault | null;
  error: string | null;
  hasPasskey: boolean;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  unlockPasskey: () => Promise<boolean>;
  lock: () => void;
  update: (fn: (v: Vault) => Vault) => void;
  registerPasskey: (accountName: string) => Promise<boolean>;
  removePasskey: () => void;
  exportBackup: () => Promise<BackupFile | null>;
  restoreBackup: (file: BackupFile, mode: "merge" | "overwrite") => Promise<boolean>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [wraps, setWraps] = useState<Wraps | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);

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

  const unlock = useCallback(async (passphrase: string) => {
    const stored = await loadStoredVault();
    if (!stored) {
      setStatus("needs-setup");
      return false;
    }
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
    if (!masterKey || !vault) return;
    setWraps((prev) => {
      if (!prev) return prev;
      const next: Wraps = { passphrase: prev.passphrase };
      void persist(vault, masterKey, next);
      return next;
    });
    setHasPasskey(false);
  }, [masterKey, vault, persist]);

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

  const value = useMemo<SessionValue>(
    () => ({
      status,
      vault,
      error,
      hasPasskey,
      setup,
      unlock,
      unlockPasskey,
      lock,
      update,
      registerPasskey,
      removePasskey,
      exportBackup,
      restoreBackup,
    }),
    [status, vault, error, hasPasskey, setup, unlock, unlockPasskey, lock, update, registerPasskey, removePasskey, exportBackup, restoreBackup]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
