// 연락 기록(언제·어떻게 연락했는지)과 "다음에 물어볼 것" 체크리스트 — 둘 다 사람(Person) 안에 쌓인다.
// 연락 기록을 남기면 lastContactAt도 같이 맞춰서, 관계 온도·연락 뜸한 사람·오늘의 추천 연락이 그대로 동작한다.
import { nanoid } from "nanoid";
import { markDeleted } from "./period-goals";
import type { ContactKind, ContactLog, FollowUp, Person, Vault } from "../types";

export const CONTACT_KINDS: { kind: ContactKind; icon: string; label: string }[] = [
  { kind: "call", icon: "📞", label: "전화" },
  { kind: "message", icon: "💬", label: "메시지" },
  { kind: "meet", icon: "☕", label: "만남" },
  { kind: "etc", icon: "✋", label: "기타" },
];

export const CONTACT_KIND_LABEL: Record<ContactKind, string> = { call: "전화", message: "메시지", meet: "만남", etc: "기타" };
export const CONTACT_KIND_ICON: Record<ContactKind, string> = { call: "📞", message: "💬", meet: "☕", etc: "✋" };

function mapPerson(vault: Vault, personId: string, fn: (p: Person) => Person): Vault {
  return { ...vault, people: vault.people.map((p) => (p.id === personId ? { ...fn(p), updatedAt: Date.now() } : p)) };
}

/** 남은 연락 기록 중 가장 최근 시각. 기록이 없으면 undefined. */
function latestContactAt(logs: ContactLog[]): number | undefined {
  return logs.length ? Math.max(...logs.map((l) => l.at)) : undefined;
}

export function addContactLog(vault: Vault, personId: string, kind: ContactKind, memo?: string, at: number = Date.now(), id: string = nanoid()): Vault {
  const log: ContactLog = { id, at, kind, ...(memo?.trim() ? { memo: memo.trim() } : {}), updatedAt: Date.now() };
  return mapPerson(vault, personId, (p) => ({
    ...p,
    contacts: [...(p.contacts ?? []), log],
    lastContactAt: Math.max(p.lastContactAt ?? 0, at),
  }));
}

/** 연락 기록을 지운다. 지운 게 마지막 연락이었다면 lastContactAt을 남은 기록 중 최신으로 되돌린다
 * (남은 기록이 없으면 연락 기록 없음 상태로). 그 외엔 lastContactAt을 건드리지 않는다. */
export function deleteContactLog(vault: Vault, personId: string, logId: string): Vault {
  return markDeleted(deleteContactLogRaw(vault, personId, logId), logId);
}

function deleteContactLogRaw(vault: Vault, personId: string, logId: string): Vault {
  return mapPerson(vault, personId, (p) => {
    const target = (p.contacts ?? []).find((l) => l.id === logId);
    const rest = (p.contacts ?? []).filter((l) => l.id !== logId);
    const wasLatest = target && p.lastContactAt === target.at;
    return { ...p, contacts: rest, lastContactAt: wasLatest ? latestContactAt(rest) : p.lastContactAt };
  });
}

export function updateContactMemo(vault: Vault, personId: string, logId: string, memo: string): Vault {
  return mapPerson(vault, personId, (p) => ({
    ...p,
    contacts: (p.contacts ?? []).map((l) => {
      if (l.id !== logId) return l;
      const { memo: _m, ...rest } = l;
      return { ...rest, ...(memo.trim() ? { memo: memo.trim() } : {}), updatedAt: Date.now() };
    }),
  }));
}

/** 최근 연락이 위로. */
export function contactTimeline(person: Person): ContactLog[] {
  return [...(person.contacts ?? [])].sort((a, b) => b.at - a.at);
}

/** 최근 n일 동안 연락한 횟수. */
export function contactCountWithin(person: Person, days: number, now: number = Date.now()): number {
  const since = now - days * 86400000;
  return (person.contacts ?? []).filter((l) => l.at >= since).length;
}

export function addFollowUp(vault: Vault, personId: string, text: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const item: FollowUp = { id, text, done: false, at: now, updatedAt: now };
  return mapPerson(vault, personId, (p) => ({ ...p, followUps: [...(p.followUps ?? []), item] }));
}

export function toggleFollowUp(vault: Vault, personId: string, followUpId: string): Vault {
  return mapPerson(vault, personId, (p) => ({
    ...p,
    followUps: (p.followUps ?? []).map((f) => {
      if (f.id !== followUpId) return f;
      const now = Date.now();
      if (f.done) {
        const { doneAt: _d, ...rest } = f;
        return { ...rest, done: false, updatedAt: now };
      }
      return { ...f, done: true, doneAt: now, updatedAt: now };
    }),
  }));
}

export function deleteFollowUp(vault: Vault, personId: string, followUpId: string): Vault {
  return markDeleted(
    mapPerson(vault, personId, (p) => ({ ...p, followUps: (p.followUps ?? []).filter((f) => f.id !== followUpId) })),
    followUpId
  );
}

/** 아직 안 물어본 것(먼저 적은 순). */
export function openFollowUps(person: Person): FollowUp[] {
  return (person.followUps ?? []).filter((f) => !f.done).sort((a, b) => a.at - b.at);
}
