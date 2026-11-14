// 목표·고치고 싶은 점 — 둘 다 "한 번 달성하면 체크하고 끝"인 항목이라 같은 구조(Goal)를 쓰고,
// Vault의 어느 필드(goals/improvements)를 쓸지만 다르다.
import { nanoid } from "nanoid";
import type { Goal, Vault } from "../types";

export type GoalField = "goals" | "improvements";

export function addGoal(vault: Vault, field: GoalField, text: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const goal: Goal = { id, text, done: false, createdAt: now, updatedAt: now };
  return { ...vault, [field]: [...(vault[field] ?? []), goal] };
}

export function toggleGoalDone(vault: Vault, field: GoalField, id: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    [field]: (vault[field] ?? []).map((g) => {
      if (g.id !== id) return g;
      const done = !g.done;
      return { ...g, done, achievedAt: done ? now : undefined, updatedAt: now };
    }),
  };
}

export function removeGoal(vault: Vault, field: GoalField, id: string): Vault {
  return { ...vault, [field]: (vault[field] ?? []).filter((g) => g.id !== id) };
}
