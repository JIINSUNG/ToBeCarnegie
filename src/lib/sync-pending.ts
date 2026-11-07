// sync.ts(Firebase SDK 전체)와 분리된 아주 작은 파일 — PWA에서 로그인 리다이렉트로 페이지가
//통째로 이동했다가 돌아왔을 때 "로그인만 하고 끝난 게 아니라 동기화(받아오기·올리기)까지 마저
// 하던 중이었다"는 걸 기억해두는 용도. session.tsx가 잠금 해제 직후 이 값을 보고 자동으로
// 동기화를 이어서 해준다 — 안 그러면 사용자가 로그인 창만 보고 돌아온 뒤 "동기화" 버튼을
// 한 번 더 눌러야 한다는 걸 몰라서 "데이터가 안 올라가요"처럼 보인다.
const KEY = "hr-sync-redirect-pending";

export function markSyncRedirectPending(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // 못 쓰는 환경이면 그냥 수동으로 한 번 더 눌러야 한다 — 치명적이진 않다
  }
}

/** 한 번 읽으면 지운다 — 자동 재시도는 한 번만. */
export function consumeSyncRedirectPending(): boolean {
  try {
    const pending = localStorage.getItem(KEY) === "1";
    localStorage.removeItem(KEY);
    return pending;
  } catch {
    return false;
  }
}
