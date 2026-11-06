// 두 Vault를 "항목(사람·기록)별로 updatedAt이 더 최신인 쪽을 남기며" 합친다.
// 백업 복원(합치기)과 2단계 Firebase 동기화가 공용으로 쓴다.
import type { Note, Person, Vault } from "../types";

function mergeNotes(a: Note[], b: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const note of a) byId.set(note.id, note);
  for (const note of b) {
    const existing = byId.get(note.id);
    if (!existing || note.updatedAt > existing.updatedAt) byId.set(note.id, note);
  }
  return [...byId.values()].sort((x, y) => x.at - y.at);
}

function mergePerson(a: Person, b: Person): Person {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    ...newer,
    notes: mergeNotes(a.notes, b.notes),
    createdAt: Math.min(a.createdAt, b.createdAt),
  };
}

export function mergeVaults(local: Vault, incoming: Vault): Vault {
  const byId = new Map<string, Person>();
  for (const person of local.people) byId.set(person.id, person);
  for (const person of incoming.people) {
    const existing = byId.get(person.id);
    byId.set(person.id, existing ? mergePerson(existing, person) : person);
  }

  const lastBackupAt = Math.max(local.lastBackupAt ?? 0, incoming.lastBackupAt ?? 0) || undefined;

  return {
    version: Math.max(local.version, incoming.version),
    people: [...byId.values()].sort((a, b) => a.createdAt - b.createdAt),
    ...(lastBackupAt ? { lastBackupAt } : {}),
  };
}
