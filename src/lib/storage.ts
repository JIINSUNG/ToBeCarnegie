// IndexedDB에 "암호화된 Vault 한 덩어리"만 저장한다. 평문은 절대 여기 안 들어온다 — 호출하는 쪽에서
// 이미 lib/crypto.ts로 암호화한 블롭만 넘긴다.
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "relationship-notes";
const DB_VERSION = 1;
const STORE = "vault";
const RECORD_KEY = "main";

export interface StoredVault {
  /** base64 salt — PBKDF2에 쓰는 값으로 비밀이 아니다. */
  salt: string;
  iv: string;
  cipher: string;
  iterations: number;
  updatedAt: number;
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
