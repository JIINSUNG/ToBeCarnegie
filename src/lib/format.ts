// 화면 여러 곳에서 똑같이 쓰던 날짜 표시 함수들 — 전엔 Briefing/Settings(timeAgo), PersonCard/
// Quotes/People(formatDate)에 똑같은 함수가 따로따로 있었다.

/** "2026.03.05" 형식 — 기록·선물·글귀처럼 "그 일이 있었던 날짜"를 보여줄 때. */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** "3분 전"/"2시간 전"/"5일 전" 형식 — 마지막 동기화·마지막 활동처럼 "얼마나 지났는지"를 보여줄 때. */
export function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}
