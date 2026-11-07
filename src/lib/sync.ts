// Firebase 구글 로그인 + Firestore로, 로그인한 사람의 암호화된 Vault를 계정별로 동기화한다.
// 여기서 주고받는 건 항상 StoredVault(마스터 키로 암호화된 블롭)뿐 — 평문은 절대 안 나간다.
// firestore.rules가 "자기 uid 문서만" 읽고 쓸 수 있게 막아서, 다른 사람 Vault는 아예 안 보인다.
// (uid는 구글 계정에 고정되니 브라우저 데이터를 지워도 같은 계정으로 다시 들어오면 그대로 이어진다.)
// 2단계 전용 — VITE_FIREBASE_* 환경변수가 없으면(.env.local 미설정) 아무 것도 하지 않는다.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect, type Auth } from "firebase/auth";
import { doc, getDoc, getFirestore, onSnapshot, setDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import type { StoredVault } from "./storage";

export { isSyncConfigured } from "./sync-env";

const VAULTS_COLLECTION = "vaults";

function readEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
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

/** 홈 화면에 설치해서 standalone(앱처럼 전체화면)으로 떠 있는 중인지. PWA에서는
 * signInWithPopup이 띄운 창이 원래 창과 제대로 안 이어져서(opener 관계가 없어짐) 로그인을 마쳐도
 * 영영 안 끝나는 경우가 많다 — 그래서 이럴 땐 팝업 대신 전체 화면 리다이렉트 방식을 쓴다. */
function isStandalonePwa(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** 구글 계정으로 로그인하고 uid를 돌려준다(이미 로그인돼 있으면 팝업 없이 그대로 씀).
 * 이후 읽기/쓰기는 이 uid 문서(vaults/{uid})로만 가서, 다른 사람 데이터와 섞이지 않는다. */
export async function signInOwner(): Promise<string> {
  const auth = getAuthInstance();
  // 리다이렉트로 돌아온 직후엔 auth.currentUser가 아직 안 채워져 있을 수 있어서, 초기 상태가
  // 다 정해질 때까지 기다린다(이미 로그인돼 있으면 거의 즉시 끝남).
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  if (isStandalonePwa()) {
    await signInWithRedirect(auth, new GoogleAuthProvider());
    // signInWithRedirect는 페이지 전체를 구글 로그인 화면으로 이동시키므로 보통 이 아래 코드는
    // 실행되지 않는다(페이지가 이동하기 전에 여기 도달해도, 호출부가 이 code를 보고 로그인 진행
    // 중으로 처리해서 "실패" 취급하지 않는다).
    throw { code: "auth/redirect-in-progress" };
  }
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
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
