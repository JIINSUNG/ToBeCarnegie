// 날짜 문자열 연산 + "연속으로 완료한 날 수" 계산 — 미션·구호처럼 "매일 체크하는 것"에 공용으로 쓴다.
export function shiftDateStr(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** date 기준 연속으로 완료한 날 수 — 오늘(date)을 아직 체크 안 했으면 어제부터 거슬러 센다
 * (오늘 체크하기 전엔 "어제까지 N일 연속"을 그대로 보여주려는 것). */
export function consecutiveStreak(date: string, isDone: (d: string) => boolean): number {
  let streak = 0;
  let cursor = isDone(date) ? date : shiftDateStr(date, -1);
  while (isDone(cursor)) {
    streak++;
    cursor = shiftDateStr(cursor, -1);
  }
  return streak;
}
