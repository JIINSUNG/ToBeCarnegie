// 매일 아침 외치는 구호 — 미션(missions.ts)과 똑같은 구조(문구 + 그날 했는지)라 로직도 거의 같다.
import { nanoid } from "nanoid";
import { consecutiveStreak } from "./streak";
import type { Mission, Vault } from "../types";

export function addAffirmation(vault: Vault, text: string, id: string = nanoid()): Vault {
  const item: Mission = { id, text, createdAt: Date.now() };
  return { ...vault, affirmations: [...(vault.affirmations ?? []), item] };
}

export function removeAffirmation(vault: Vault, id: string): Vault {
  return { ...vault, affirmations: (vault.affirmations ?? []).filter((m) => m.id !== id) };
}

export function isAffirmationDone(vault: Vault, id: string, date: string): boolean {
  return (vault.affirmationDone?.[date] ?? []).includes(id);
}

export function toggleAffirmationDone(vault: Vault, id: string, date: string): Vault {
  const current = vault.affirmationDone?.[date] ?? [];
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  return { ...vault, affirmationDone: { ...vault.affirmationDone, [date]: next } };
}

export function affirmationStreak(vault: Vault, id: string, date: string): number {
  return consecutiveStreak(date, (d) => isAffirmationDone(vault, id, d));
}
