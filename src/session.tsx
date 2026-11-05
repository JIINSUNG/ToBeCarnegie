// 앱 전체의 잠금 상태 관리. 복호화된 Vault와 암호화 키는 이 안의 React state(메모리)에만 있고,
// lock()을 부르면 바로 버려진다 — 새로고침하면 당연히 다시 암호를 입력해야 한다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PBKDF2_ITERATIONS, decryptWithKey, deriveKey, encryptWithKey, randomSalt, saltFromBase64, saltToBase64 } from "./lib/crypto";
import { loadStoredVault, requestPersistence, saveStoredVault } from "./lib/storage";
import { emptyVault, type Vault } from "./types";

type Status = "loading" | "needs-setup" | "locked" | "unlocked";

interface KeyMaterial {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
}

interface SessionValue {
  status: Status;
  vault: Vault | null;
  error: string | null;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  update: (fn: (v: Vault) => Vault) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyMat, setKeyMat] = useState<KeyMaterial | null>(null);

  useEffect(() => {
    loadStoredVault().then((stored) => {
      setStatus(stored ? "locked" : "needs-setup");
    });
  }, []);

  const persist = useCallback(async (nextVault: Vault, km: KeyMaterial) => {
    const blob = await encryptWithKey(km.key, nextVault);
    await saveStoredVault({
      salt: saltToBase64(km.salt),
      iv: blob.iv,
      cipher: blob.cipher,
      iterations: km.iterations,
      updatedAt: Date.now(),
    });
  }, []);

  const setup = useCallback(
    async (passphrase: string) => {
      const salt = randomSalt();
      const key = await deriveKey(passphrase, salt);
      const km: KeyMaterial = { key, salt, iterations: PBKDF2_ITERATIONS };
      const newVault = emptyVault();
      await persist(newVault, km);
      await requestPersistence();
      setKeyMat(km);
      setVault(newVault);
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
      const salt = saltFromBase64(stored.salt);
      const key = await deriveKey(passphrase, salt, stored.iterations);
      const decrypted = await decryptWithKey<Vault>(key, { iv: stored.iv, cipher: stored.cipher });
      setKeyMat({ key, salt, iterations: stored.iterations });
      setVault(decrypted);
      setError(null);
      setStatus("unlocked");
      return true;
    } catch {
      setError("암호가 맞지 않아요.");
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setKeyMat(null);
    setVault(null);
    setError(null);
    setStatus("locked");
  }, []);

  const update = useCallback(
    (fn: (v: Vault) => Vault) => {
      setVault((prev) => {
        if (!prev || !keyMat) return prev;
        const next = fn(prev);
        void persist(next, keyMat);
        return next;
      });
    },
    [keyMat, persist]
  );

  const value = useMemo<SessionValue>(
    () => ({ status, vault, error, setup, unlock, lock, update }),
    [status, vault, error, setup, unlock, lock, update]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
