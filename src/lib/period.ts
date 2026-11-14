// 기간 키 계산 — 연간 "2026", 월간 "2026-11", 주간 "2026-W46"(ISO 주, 월요일 시작).
import type { GoalPeriod } from "../types";

function parse(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO 주차 — 그 주 목요일이 속한 해와, 그 해 몇 번째 주인지. */
function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (t.getDay() + 6) % 7; // 월=0
  t.setDate(t.getDate() - day + 3); // 그 주 목요일
  const firstThu = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  return { year: t.getFullYear(), week };
}

/** 그 주 월요일 날짜. */
function weekMonday(key: string): Date {
  const [y, w] = key.split("-W").map(Number);
  const jan4 = new Date(y, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
  return mon;
}

export function periodKey(period: GoalPeriod, date: string): string {
  const d = parse(date);
  if (period === "year") return String(d.getFullYear());
  if (period === "month") return date.slice(0, 7);
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** 기간 키의 시작·끝 날짜(포함). */
export function periodRange(period: GoalPeriod, key: string): { start: string; end: string } {
  if (period === "year") return { start: `${key}-01-01`, end: `${key}-12-31` };
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    return { start: `${key}-01`, end: ymd(new Date(y, m, 0)) };
  }
  const mon = weekMonday(key);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: ymd(mon), end: ymd(sun) };
}

export function shiftPeriod(period: GoalPeriod, key: string, n: number): string {
  if (period === "year") return String(Number(key) + n);
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    return ymd(new Date(y, m - 1 + n, 1)).slice(0, 7);
  }
  const mon = weekMonday(key);
  mon.setDate(mon.getDate() + n * 7);
  return periodKey("week", ymd(mon));
}

export const PERIOD_LABEL: Record<GoalPeriod, string> = { year: "연간", month: "월간", week: "주간" };

/** "2026년" / "2026년 11월" / "11월 9일 ~ 15일" 같은 표시. */
export function periodTitle(period: GoalPeriod, key: string): string {
  if (period === "year") return `${key}년`;
  if (period === "month") return `${key.slice(0, 4)}년 ${Number(key.slice(5))}월`;
  const { start, end } = periodRange("week", key);
  const sm = Number(start.slice(5, 7));
  const em = Number(end.slice(5, 7));
  return `${sm}월 ${Number(start.slice(8))}일 ~ ${em !== sm ? `${em}월 ` : ""}${Number(end.slice(8))}일`;
}

/** "이번 주/지난주/다음 주" 같은 상대 표시. 멀면 null. */
export function periodRelative(period: GoalPeriod, key: string, today: string): string | null {
  const cur = periodKey(period, today);
  const unit = { year: "해", month: "달", week: "주" }[period];
  if (key === cur) return `이번 ${unit}`;
  if (key === shiftPeriod(period, cur, -1)) return period === "year" ? "작년" : `지난${period === "week" ? "주" : "달"}`;
  if (key === shiftPeriod(period, cur, 1)) return period === "year" ? "내년" : `다음 ${unit}`;
  return null;
}
