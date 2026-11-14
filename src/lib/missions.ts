// 스스로에게 주는 반복 미션 — 한 번 등록하면 매일 다시 나타나고, 그날그날 체크한다.
// 두 종류가 있다:
//  - 체크 미션(target 없음): 체크박스 하나로 달성/미달성 — missionDone[date]에 id가 있으면 달성.
//  - 횟수 미션(target 있음, 예: "고객 5명에게 연락", "물 5잔"): + / − 로 세고, 센 값이 target 이상이면 달성.
//    센 값은 missionCount[date][id]에 둔다. 체크박스를 누르면 한 번에 target까지 채우거나 0으로 되돌린다.
import { nanoid } from "nanoid";
import { consecutiveStreak, shiftDateStr } from "./streak";
import type { Mission, Vault } from "../types";

export const MAX_MISSION_TARGET = 999;

export interface MissionOptions {
  target?: number;
  unit?: string;
}

/** 목표 횟수 정리 — 1 미만·숫자 아님이면 "횟수 없음"(체크 미션), 너무 크면 상한으로 자른다. */
export function normalizeTarget(target: number | undefined): number | undefined {
  if (target == null || !Number.isFinite(target)) return undefined;
  const n = Math.floor(target);
  if (n < 1) return undefined;
  return Math.min(n, MAX_MISSION_TARGET);
}

function cleanOptions(opts: MissionOptions): MissionOptions {
  const target = normalizeTarget(opts.target);
  const unit = opts.unit?.trim();
  return { ...(target ? { target } : {}), ...(target && unit ? { unit } : {}) };
}

export function addMission(vault: Vault, text: string, id: string = nanoid(), opts: MissionOptions = {}): Vault {
  const now = Date.now();
  const mission: Mission = { id, text, ...cleanOptions(opts), createdAt: now, updatedAt: now };
  return { ...vault, missions: [...(vault.missions ?? []), mission] };
}

/** 문구·목표 횟수·단위를 고친다. 횟수를 지우면 체크 미션이 된다. */
export function updateMission(vault: Vault, id: string, text: string, opts: MissionOptions = {}): Vault {
  return {
    ...vault,
    missions: (vault.missions ?? []).map((m) => {
      if (m.id !== id) return m;
      const { target: _t, unit: _u, ...rest } = m;
      return { ...rest, text, ...cleanOptions(opts), updatedAt: Date.now() };
    }),
  };
}

export function removeMission(vault: Vault, id: string): Vault {
  return { ...vault, missions: (vault.missions ?? []).filter((m) => m.id !== id) };
}

export function findMission(vault: Vault, id: string): Mission | undefined {
  return (vault.missions ?? []).find((m) => m.id === id);
}

/** 그날 센 횟수(횟수 미션). 안 셌으면 0. */
export function missionCount(vault: Vault, id: string, date: string): number {
  return vault.missionCount?.[date]?.[id]?.n ?? 0;
}

export function isMissionDone(vault: Vault, id: string, date: string): boolean {
  const target = findMission(vault, id)?.target;
  if (target) return missionCount(vault, id, date) >= target;
  return (vault.missionDone?.[date] ?? []).includes(id);
}

/** 그날 센 횟수를 n으로 맞춘다(0 미만은 0, 상한은 target의 10배 정도까지만 — 실수로 계속 눌러도 폭주 안 하게). */
export function setMissionCount(vault: Vault, id: string, date: string, n: number): Vault {
  const target = findMission(vault, id)?.target ?? MAX_MISSION_TARGET;
  const clamped = Math.max(0, Math.min(Math.floor(n), Math.max(target * 10, target + 20)));
  return {
    ...vault,
    missionCount: {
      ...vault.missionCount,
      [date]: { ...vault.missionCount?.[date], [id]: { n: clamped, at: Date.now() } },
    },
  };
}

/** + / − 버튼. 목표를 넘겨서 더 세는 것도 허용한다(물 7잔 마신 날도 있으니까). */
export function stepMissionCount(vault: Vault, id: string, date: string, delta: number): Vault {
  return setMissionCount(vault, id, date, missionCount(vault, id, date) + delta);
}

/** 체크박스. 체크 미션은 달성 여부를 뒤집고, 횟수 미션은 미달성이면 target까지 채우고 달성이면 0으로 되돌린다. */
export function toggleMissionDone(vault: Vault, id: string, date: string): Vault {
  const target = findMission(vault, id)?.target;
  if (target) return setMissionCount(vault, id, date, isMissionDone(vault, id, date) ? 0 : target);
  const current = vault.missionDone?.[date] ?? [];
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  return { ...vault, missionDone: { ...vault.missionDone, [date]: next } };
}

export function missionStreak(vault: Vault, id: string, date: string): number {
  return consecutiveStreak(date, (d) => isMissionDone(vault, id, d));
}

/** "3 / 5명" 같은 진행 표시. */
export function formatMissionProgress(mission: Mission, count: number): string {
  return `${count} / ${mission.target ?? 1}${mission.unit ?? ""}`;
}

export interface MissionDay {
  date: string;
  /** 그날 있던 미션 수(그날 끝나기 전에 만든 미션만 센다). */
  total: number;
  done: number;
}

function endOfDayMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d + 1).getTime() - 1;
}

/** endDate(포함)로 끝나는 최근 days일의 날짜별 미션 달성 — 달력·주간 달성률용. 오래된 날이 앞. */
export function missionHistory(vault: Vault, endDate: string, days: number): MissionDay[] {
  const missions = vault.missions ?? [];
  const out: MissionDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDateStr(endDate, -i);
    const end = endOfDayMs(date);
    const alive = missions.filter((m) => m.createdAt <= end);
    out.push({ date, total: alive.length, done: alive.filter((m) => isMissionDone(vault, m.id, date)).length });
  }
  return out;
}

/** 기간 전체 달성률(0~1) — 미션이 있던 날만 센다. 미션이 하나도 없던 기간이면 null. */
export function missionRate(history: MissionDay[]): number | null {
  const total = history.reduce((s, d) => s + d.total, 0);
  if (!total) return null;
  return history.reduce((s, d) => s + d.done, 0) / total;
}
