// IndexedDB에 "암호화된 Vault 한 덩어리"만 저장한다. 평문은 절대 여기 안 들어온다 — 호출하는 쪽에서
// 이미 lib/crypto.ts로 암호화한 블롭만 넘긴다.
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "relationship-notes";
const DB_VERSION = 1;
const STORE = "vault";
const RECORD_KEY = "main";

export interface WrappedKey {
  /** base64 — 감싸진(wrapped) 마스터 키 블롭의 iv/cipher. */
  iv: string;
  cipher: string;
}

export interface PassphraseUnlock extends WrappedKey {
  /** base64 salt — PBKDF2에 쓰는 값으로 비밀이 아니다. */
  salt: string;
  iterations: number;
}

export interface PasskeyUnlock extends WrappedKey {
  /** base64url. */
  credentialId: string;
  /** base64 — PRF 평가에 쓰는 고정 salt. 비밀이 아니다. */
  prfSalt: string;
}

export interface StoredVault {
  /** Vault 본문 — 마스터 키로 암호화됨. */
  iv: string;
  cipher: string;
  updatedAt: number;
  /** 마스터 키를 패스프레이즈 KEK로 감싼 것. 항상 있다. */
  passphrase: PassphraseUnlock;
  /** 마스터 키를 패스키 PRF KEK로 감싼 것. 등록했을 때만 있다. */
  passkey?: PasskeyUnlock;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function loadStoredVault(): Promise<StoredVault | undefined> {
  const db = await getDb();
  return db.get(STORE, RECORD_KEY);
}

export async function saveStoredVault(v: StoredVault): Promise<void> {
  const db = await getDb();
  await db.put(STORE, v, RECORD_KEY);
}

export async function clearStoredVault(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, RECORD_KEY);
}

/** 브라우저가 기기 정리 중에 이 데이터를 지우지 않도록 "영구 저장"을 요청한다. 안 되는 브라우저면 조용히 무시. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
