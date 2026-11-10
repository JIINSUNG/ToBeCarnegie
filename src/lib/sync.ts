// Firebase 구글 로그인 + Firestore로, 로그인한 사람의 암호화된 Vault를 계정별로 동기화한다.
// firestore.rules가 "자기 uid 문서만" 읽고 쓸 수 있게 막아서, 다른 사람 Vault는 아예 안 보인다.
// (uid는 구글 계정에 고정되니 브라우저 데이터를 지워도 같은 계정으로 다시 들어오면 그대로 이어진다.)
// 기기마다 패스프레이즈가 달라도(그냥 그 기기 잠금 용도일 뿐) 동기화가 되도록, 여기서 주고받는
// 건 StoredVault가 아니라 CloudVault다 — 마스터 키를 패스프레이즈로 감싸지 않고 그대로(base64)
// 올린다. 그만큼 "서버가 절대 복호화 못 함"은 아니게 됐고, firestore.rules(로그인한 본인만 읽기/
// 쓰기)가 유일한 방어선이다 — 사용자가 이 트레이드오프를 받아들이기로 하고 선택한 구조다.
// 2단계 전용 — VITE_FIREBASE_* 환경변수가 없으면(.env.local 미설정) 아무 것도 하지 않는다.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect, type Auth } from "firebase/auth";
import { doc, getDoc, getFirestore, onSnapshot, setDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { markSyncRedirectPending } from "./sync-pending";

export interface CloudVault {
  /** Vault 본문 — 마스터 키로 암호화됨. */
  iv: string;
  cipher: string;
  updatedAt: number;
  /** base64 — 마스터 키 원본(감싸지 않음). 같은 구글 계정의 어느 기기든 이 값으로 바로 복호화한다. */
  masterKeyB64: string;
}

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

/** 홈 화면에 설치해서 standalone(앱처럼 전체화면)으로 떠 있는 중인지. 일부 환경(특히 iOS의 홈
 * 화면 추가 PWA)에서는 signInWithPopup이 띄운 창이 원래 창과 제대로 안 이어져서 로그인을 마쳐도
 * 안 끝나거나 팝업 자체가 막히는데, 안드로이드 Chrome PWA 등에서는 멀쩡히 되는 경우도 많다 —
 * 그래서 standalone이라고 무조건 리다이렉트로 보내지 않고, 팝업을 먼저 시도해본다. */
function isStandalonePwa(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function errorCode(err: unknown): string | null {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
}

/** 구글 계정으로 로그인하고 uid를 돌려준다(이미 로그인돼 있으면 팝업 없이 그대로 씀).
 * 이후 읽기/쓰기는 이 uid 문서(vaults/{uid})로만 가서, 다른 사람 데이터와 섞이지 않는다.
 * allowRedirect=false면(리다이렉트로 돌아온 직후 자동으로 동기화를 이어갈 때) 로그인이 아직
 * 안 돼 있어도 또 리다이렉트하지 않는다 — 일부 환경(특히 PWA)에서는 리다이렉트 결과가 저장소에
 * 제대로 안 남아 auth.currentUser가 끝내 안 채워지는 경우가 있는데, 그럴 때 자동으로 또
 * 리다이렉트하면 "파이어베이스로 이동 → 앱 → 파이어베이스로 이동" 무한 루프가 된다. */
export async function signInOwner(allowRedirect = true): Promise<string> {
  const auth = getAuthInstance();
  // 리다이렉트로 돌아온 직후엔 auth.currentUser가 아직 안 채워져 있을 수 있어서, 초기 상태가
  // 다 정해질 때까지 기다린다(이미 로그인돼 있으면 거의 즉시 끝남).
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;

  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    return user.uid;
  } catch (err) {
    const code = errorCode(err);
    // 팝업이 아예 못 뜨는 경우에만 리다이렉트로 대체한다(standalone 환경 한정) — 사용자가 로그인
    // 창을 스스로 닫은 경우 등은 그대로 실패로 보여준다.
    const popupBlocked = code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment";
    if (!popupBlocked || !isStandalonePwa()) throw err;
    if (!allowRedirect) throw { code: "auth/redirect-failed" };
    // 로그인만 하고 끝난 게 아니라 이 동기화(받아오기·올리기)까지 하려던 거였다는 걸 남겨둔다 —
    // 리다이렉트로 돌아와서 잠금을 풀면 session.tsx가 이 값을 보고 자동으로 마저 동기화한다.
    markSyncRedirectPending();
    await signInWithRedirect(auth, new GoogleAuthProvider());
    // signInWithRedirect는 페이지 전체를 구글 로그인 화면으로 이동시키므로 보통 이 아래 코드는
    // 실행되지 않는다(페이지가 이동하기 전에 여기 도달해도, 호출부가 이 code를 보고 로그인 진행
    // 중으로 처리해서 "실패" 취급하지 않는다).
    throw { code: "auth/redirect-in-progress" };
  }
}

/** 지금 로그인된 상태인지(팝업/리다이렉트 없이 조용히 확인). 자동 동기화가 로그인 안 한
 * 사람에게 갑자기 로그인 창을 띄우지 않고 "이미 로그인돼 있을 때만" 조용히 돌게 하는 데 쓴다. */
export async function isSignedIn(): Promise<boolean> {
  const auth = getAuthInstance();
  await auth.authStateReady();
  return !!auth.currentUser;
}

/** 지금 로그인된 uid(없으면 null) — 팝업/리다이렉트 없이 조용히 확인만 한다. */
export async function getCurrentUid(): Promise<string | null> {
  const auth = getAuthInstance();
  await auth.authStateReady();
  return auth.currentUser?.uid ?? null;
}

export async function pullStoredVault(uid: string): Promise<CloudVault | null> {
  const snap = await getDoc(doc(getDb(), VAULTS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  // 예전 방식(패스프레이즈로 감싼 StoredVault)으로 올라온 문서는 새 방식으로 못 읽는다 — 그냥
  // "클라우드에 쓸만한 게 없다"로 취급하면, 어느 기기든 다시 동기화할 때 새 방식으로 다시 올라간다.
  if (typeof data.masterKeyB64 !== "string") return null;
  return data as CloudVault;
}

export async function pushStoredVault(uid: string, cloud: CloudVault): Promise<void> {
  // Firestore는 필드 값이 undefined면 바로 거부한다("invalid-argument") — 안전하게 걸러내고 보낸다.
  const clean = Object.fromEntries(Object.entries(cloud).filter(([, v]) => v !== undefined));
  await setDoc(doc(getDb(), VAULTS_COLLECTION, uid), clean);
}

export function subscribeStoredVault(uid: string, onChange: (cloud: CloudVault | null) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), VAULTS_COLLECTION, uid), (snap) => {
    if (!snap.exists()) return onChange(null);
    const data = snap.data();
    onChange(typeof data.masterKeyB64 === "string" ? (data as CloudVault) : null);
  });
}
