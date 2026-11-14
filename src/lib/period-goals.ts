// 연간·월간·주간 목표 + 시도 기록 + 기간 돌아보기 + 영향·영감 노트.
// 지울 땐 deletedIds에 남겨서, 동기화 병합 때 다른 기기에 남은 옛 사본이 되살아나지 않게 한다(merge.ts).
import { nanoid } from "nanoid";
import type { GoalAttempt, GoalPeriod, InfluenceStory, PeriodGoal, PeriodReflection, Vault } from "../types";

export function markDeleted(vault: Vault, ...ids: string[]): Vault {
  const now = Date.now();
  return { ...vault, deletedIds: { ...vault.deletedIds, ...Object.fromEntries(ids.map((id) => [id, now])) } };
}

function mapGoal(vault: Vault, id: string, fn: (g: PeriodGoal) => PeriodGoal): Vault {
  return { ...vault, periodGoals: (vault.periodGoals ?? []).map((g) => (g.id === id ? { ...fn(g), updatedAt: Date.now() } : g)) };
}

const opt = (k: string, v: string | undefined) => (v?.trim() ? { [k]: v.trim() } : {});

// ── 기간 목표 ──────────────────────────────────────────

export function addPeriodGoal(vault: Vault, period: GoalPeriod, key: string, text: string, why?: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const g: PeriodGoal = { id, period, key, text: text.trim(), ...opt("why", why), status: "doing", attempts: [], createdAt: now, updatedAt: now };
  return { ...vault, periodGoals: [...(vault.periodGoals ?? []), g] };
}

export function editPeriodGoal(vault: Vault, id: string, text: string, why?: string): Vault {
  return mapGoal(vault, id, (g) => {
    const { why: _w, ...rest } = g;
    return { ...rest, text: text.trim(), ...opt("why", why) };
  });
}

export function setGoalStatus(vault: Vault, id: string, status: PeriodGoal["status"]): Vault {
  return mapGoal(vault, id, (g) => {
    const { doneAt: _d, ...rest } = g;
    return { ...rest, status, ...(status === "done" ? { doneAt: Date.now() } : {}) };
  });
}

export function deletePeriodGoal(vault: Vault, id: string): Vault {
  const g = (vault.periodGoals ?? []).find((x) => x.id === id);
  const next = { ...vault, periodGoals: (vault.periodGoals ?? []).filter((x) => x.id !== id) };
  return markDeleted(next, id, ...(g?.attempts.map((a) => a.id) ?? []));
}

/** 못 끝낸 목표를 다음 기간으로 — 원래 목표는 그대로 두고, 같은 문구로 새 목표를 만든다(시도 기록은 안 옮김). */
export function carryOver(vault: Vault, id: string, toKey: string, newId: string = nanoid()): Vault {
  const g = (vault.periodGoals ?? []).find((x) => x.id === id);
  if (!g) return vault;
  return addPeriodGoal(vault, g.period, toKey, g.text, g.why, newId);
}

export function goalsFor(vault: Vault, period: GoalPeriod, key: string): PeriodGoal[] {
  const order = { doing: 0, done: 1, dropped: 2 };
  return (vault.periodGoals ?? []).filter((g) => g.period === period && g.key === key).sort((a, b) => order[a.status] - order[b.status] || a.createdAt - b.createdAt);
}

export function periodProgress(goals: PeriodGoal[]): { done: number; total: number } {
  const counted = goals.filter((g) => g.status !== "dropped");
  return { done: counted.filter((g) => g.status === "done").length, total: counted.length };
}

// ── 시도 ───────────────────────────────────────────────

export interface AttemptInput {
  did: string;
  result?: string;
  outcome?: GoalAttempt["outcome"];
  learned?: string;
}

function cleanAttempt(a: AttemptInput) {
  return { did: a.did.trim(), ...opt("result", a.result), ...(a.outcome ? { outcome: a.outcome } : {}), ...opt("learned", a.learned) };
}

export function addAttempt(vault: Vault, goalId: string, input: AttemptInput, at: number = Date.now(), id: string = nanoid()): Vault {
  const a: GoalAttempt = { id, at, ...cleanAttempt(input), updatedAt: Date.now() };
  return mapGoal(vault, goalId, (g) => ({ ...g, attempts: [...g.attempts, a] }));
}

export function editAttempt(vault: Vault, goalId: string, attemptId: string, input: AttemptInput): Vault {
  return mapGoal(vault, goalId, (g) => ({
    ...g,
    attempts: g.attempts.map((a) => (a.id === attemptId ? { id: a.id, at: a.at, ...cleanAttempt(input), updatedAt: Date.now() } : a)),
  }));
}

export function deleteAttempt(vault: Vault, goalId: string, attemptId: string): Vault {
  return markDeleted(
    mapGoal(vault, goalId, (g) => ({ ...g, attempts: g.attempts.filter((a) => a.id !== attemptId) })),
    attemptId
  );
}

// ── 돌아보기 ───────────────────────────────────────────

export function reflectionId(period: GoalPeriod, key: string): string {
  return `${period}:${key}`;
}

export function findReflection(vault: Vault, period: GoalPeriod, key: string): PeriodReflection | undefined {
  return (vault.reflections ?? []).find((r) => r.id === reflectionId(period, key));
}

export function saveReflection(vault: Vault, period: GoalPeriod, key: string, fields: { good: string; bad: string; next: string }): Vault {
  const id = reflectionId(period, key);
  const r: PeriodReflection = { id, period, key, good: fields.good.trim(), bad: fields.bad.trim(), next: fields.next.trim(), updatedAt: Date.now() };
  const rest = (vault.reflections ?? []).filter((x) => x.id !== id);
  const empty = !r.good && !r.bad && !r.next;
  // 다 비우고 저장하면 지운 것으로 — 다른 기기에서 되살아나지 않게 삭제 기록도 남긴다.
  if (empty) return markDeleted({ ...vault, reflections: rest }, id);
  // 한 번 지웠다가 다시 쓰는 경우를 위해 삭제 기록은 걷어낸다.
  const { [id]: _drop, ...deletedIds } = vault.deletedIds ?? {};
  return { ...vault, reflections: [...rest, r], deletedIds };
}

// ── 영향·영감 노트 ──────────────────────────────────────

export interface StoryInput {
  kind: InfluenceStory["kind"];
  text: string;
  personId?: string;
  who?: string;
  lesson?: string;
}

function cleanStory(s: StoryInput) {
  return { kind: s.kind, text: s.text.trim(), ...opt("personId", s.personId), ...opt("who", s.who), ...opt("lesson", s.lesson) };
}

export function addStory(vault: Vault, input: StoryInput, at: number = Date.now(), id: string = nanoid()): Vault {
  const s: InfluenceStory = { id, ...cleanStory(input), at, updatedAt: Date.now() };
  return { ...vault, stories: [...(vault.stories ?? []), s] };
}

export function editStory(vault: Vault, id: string, input: StoryInput): Vault {
  return {
    ...vault,
    stories: (vault.stories ?? []).map((s) => (s.id === id ? { id: s.id, at: s.at, ...cleanStory(input), updatedAt: Date.now() } : s)),
  };
}

export function deleteStory(vault: Vault, id: string): Vault {
  return markDeleted({ ...vault, stories: (vault.stories ?? []).filter((s) => s.id !== id) }, id);
}

export function storiesFor(vault: Vault, filter: { kind?: InfluenceStory["kind"]; personId?: string; q?: string } = {}): InfluenceStory[] {
  const q = (filter.q ?? "").trim().toLowerCase();
  const nameOf = (id?: string) => (id ? vault.people.find((p) => p.id === id)?.name ?? "" : "");
  return (vault.stories ?? [])
    .filter((s) => !filter.kind || s.kind === filter.kind)
    .filter((s) => !filter.personId || s.personId === filter.personId)
    .filter((s) => !q || [s.text, s.lesson, s.who, nameOf(s.personId)].some((t) => (t ?? "").toLowerCase().includes(q)))
    .sort((a, b) => b.at - a.at);
}
