// 스스로에게 주는 반복 미션 — 한 번 등록하면 매일 다시 나타나고, 그날그날 체크한다.
import { nanoid } from "nanoid";
import { consecutiveStreak } from "./streak";
import type { Mission, Vault } from "../types";

export function addMission(vault: Vault, text: string, id: string = nanoid()): Vault {
  const mission: Mission = { id, text, createdAt: Date.now() };
  return { ...vault, missions: [...(vault.missions ?? []), mission] };
}

export function removeMission(vault: Vault, id: string): Vault {
  return { ...vault, missions: (vault.missions ?? []).filter((m) => m.id !== id) };
}

export function isMissionDone(vault: Vault, id: string, date: string): boolean {
  return (vault.missionDone?.[date] ?? []).includes(id);
}

export function toggleMissionDone(vault: Vault, id: string, date: string): Vault {
  const current = vault.missionDone?.[date] ?? [];
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  return { ...vault, missionDone: { ...vault.missionDone, [date]: next } };
}

export function missionStreak(vault: Vault, id: string, date: string): number {
  return consecutiveStreak(date, (d) => isMissionDone(vault, id, d));
}
