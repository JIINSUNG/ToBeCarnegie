// 감사·칭찬 기록 — 고마웠던 일(thanks)과 내가 한 칭찬(praise)을 사람별로 쌓는다.
// 카네기의 "솔직하고 진심 어린 인정" 원칙을 일상에서 연습하려는 것.
import { nanoid } from "nanoid";
import { markDeleted } from "./period-goals";
import type { Appreciation, Person, Vault } from "../types";

const DAY = 86400000;

export const APPRECIATION_KIND: Record<Appreciation["kind"], { icon: string; label: string; verb: string }> = {
  thanks: { icon: "🙏", label: "고마웠던 일", verb: "고마웠어요" },
  praise: { icon: "👏", label: "칭찬한 일", verb: "칭찬했어요" },
};

export interface AppreciationInput {
  kind: Appreciation["kind"];
  text: string;
  personId?: string;
  who?: string;
  expressed?: boolean;
}

function clean(a: AppreciationInput) {
  const who = a.personId ? undefined : a.who?.trim();
  return {
    kind: a.kind,
    text: a.text.trim(),
    ...(a.personId ? { personId: a.personId } : {}),
    ...(who ? { who } : {}),
    ...(a.expressed ? { expressed: true } : {}),
  };
}

export function addAppreciation(vault: Vault, input: AppreciationInput, at: number = Date.now(), id: string = nanoid()): Vault {
  const a: Appreciation = { id, ...clean(input), at, updatedAt: Date.now() };
  return { ...vault, appreciations: [...(vault.appreciations ?? []), a] };
}

/** "직접 말했어요" 토글 — 고마운 마음을 상대에게 표현했는지. */
export function toggleExpressed(vault: Vault, id: string): Vault {
  return {
    ...vault,
    appreciations: (vault.appreciations ?? []).map((a) => {
      if (a.id !== id) return a;
      const { expressed, ...rest } = a;
      return { ...rest, ...(expressed ? {} : { expressed: true }), updatedAt: Date.now() };
    }),
  };
}

export function deleteAppreciation(vault: Vault, id: string): Vault {
  return markDeleted({ ...vault, appreciations: (vault.appreciations ?? []).filter((a) => a.id !== id) }, id);
}

export function appreciationsFor(vault: Vault, filter: { personId?: string; kind?: Appreciation["kind"] } = {}): Appreciation[] {
  return (vault.appreciations ?? [])
    .filter((a) => !filter.personId || a.personId === filter.personId)
    .filter((a) => !filter.kind || a.kind === filter.kind)
    .sort((a, b) => b.at - a.at);
}

/** 오늘(로컬 날짜) 남긴 감사·칭찬 수. */
export function appreciationsToday(vault: Vault, now: number = Date.now()): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return (vault.appreciations ?? []).filter((a) => a.at >= start && a.at < start + DAY).length;
}

export interface QuietPerson {
  person: Person;
  /** 마지막으로 감사·칭찬을 남긴 뒤 지난 날 수. 한 번도 없으면 null. */
  daysSince: number | null;
}

/** 꾸준히 연락하는(최근 90일 안에 연락한) 사람인데 thresholdDays 넘게 감사·칭찬을 남기지 않은 사람들 —
 * "가까운데 고마움을 표현한 지 오래된" 사람. 오래된 순, 최대 limit명. */
export function quietAppreciation(vault: Vault, now: number = Date.now(), thresholdDays = 60, limit = 5): QuietPerson[] {
  const last = new Map<string, number>();
  for (const a of vault.appreciations ?? []) if (a.personId) last.set(a.personId, Math.max(last.get(a.personId) ?? 0, a.at));
  return vault.people
    .filter((p) => p.lastContactAt && now - p.lastContactAt <= 90 * DAY)
    .map((p) => {
      const t = last.get(p.id);
      return { person: p, daysSince: t ? Math.floor((now - t) / DAY) : null };
    })
    .filter((q) => q.daysSince === null || q.daysSince >= thresholdDays)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity) || (b.person.lastContactAt ?? 0) - (a.person.lastContactAt ?? 0))
    .slice(0, limit);
}
