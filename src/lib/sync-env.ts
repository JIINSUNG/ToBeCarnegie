// sync.ts(Firebase SDK 전체를 끌어온다)와 분리된, env 체크만 하는 아주 작은 파일.
// session.tsx가 "동기화 섹션을 보여줄지"를 매 렌더 판단하는 데 쓰는데, 이걸 sync.ts에서 가져오면
// 동기화를 한 번도 안 쓰는 사람도 Firebase SDK(수백 KB)가 번들에 딸려 들어온다.
export function isSyncConfigured(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  return !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);
}
