// Firebase 익명 인증 + Firestore로 "소유자 1명"의 암호화된 Vault를 동기화한다.
// 여기서 주고받는 건 항상 StoredVault(마스터 키로 암호화된 블롭)뿐 — 평문은 절대 안 나간다.
// firestore.rules가 MY_UID 한 명의 uid만 읽기/쓰기를 허용하므로, 다른 익명 계정은 거부당한다.
// 2단계 전용 — VITE_FIREBASE_* 환경변수가 없으면(.env.local 미설정) 아무 것도 하지 않는다.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { doc, getDoc, getFirestore, onSnapshot, setDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import type { StoredVault } from "./storage";

const VAULTS_COLLECTION = "vaults";

function readEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export function isSyncConfigured(): boolean {
  return !!(readEnv("VITE_FIREBASE_API_KEY") && readEnv("VITE_FIREBASE_PROJECT_ID"));
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: readEnv("VITE_FIREBASE_API_KEY"),
      authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
      projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
      storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
      appId: readEnv("VITE_FIREBASE_APP_ID"),
    });
  }
  return app;
}

function getAuthInstance(): Auth {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}

/** 익명으로 로그인하고 uid를 돌려준다. firestore.rules가 이미 등록해둔 MY_UID만 허용하므로,
 * 소유자가 처음 쓰는 기기가 아니면(= 그 uid가 아니면) 이후 읽기/쓰기에서 전부 거부된다. */
export async function signInOwner(): Promise<string> {
  const { user } = await signInAnonymously(getAuthInstance());
  return user.uid;
}

export async function pullStoredVault(uid: string): Promise<StoredVault | null> {
  const snap = await getDoc(doc(getDb(), VAULTS_COLLECTION, uid));
  return snap.exists() ? (snap.data() as StoredVault) : null;
}

export async function pushStoredVault(uid: string, stored: StoredVault): Promise<void> {
  await setDoc(doc(getDb(), VAULTS_COLLECTION, uid), stored);
}

export function subscribeStoredVault(uid: string, onChange: (stored: StoredVault | null) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), VAULTS_COLLECTION, uid), (snap) => onChange(snap.exists() ? (snap.data() as StoredVault) : null));
}
