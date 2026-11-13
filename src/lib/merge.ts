// 두 Vault를 "항목(사람·기록·선물·기념일 등)별로 updatedAt이 더 최신인 쪽을 남기며" 합친다.
// 백업 복원(합치기)과 2단계 Firebase 동기화가 공용으로 쓴다.
// id가 있는 항목(notes/gifts/anniversaries)은 id 기준으로, id가 없는 단순 목록(likes 등)은
// 합집합으로 합친다 — 두 기기에서 각자 추가한 내용이 한쪽만 "더 최신"이라고 통째로 사라지지 않게.
import type { Anniversary, Book, CustomWisdom, DailyIntention, Gift, Intention, Note, Person, Vault } from "../types";

function mergeById<T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function mergeNotes(a: Note[], b: Note[]): Note[] {
  return mergeById(a, b).sort((x, y) => x.at - y.at);
}

function mergeGifts(a: Gift[], b: Gift[]): Gift[] {
  return mergeById(a, b).sort((x, y) => x.at - y.at);
}

function mergeAnniversaries(a: Anniversary[], b: Anniversary[]): Anniversary[] {
  return mergeById(a, b).sort((x, y) => x.date.localeCompare(y.date));
}

function mergeIntentions(a: Intention[], b: Intention[]): Intention[] {
  return mergeById(a, b).sort((x, y) => x.at - y.at);
}

/** id가 없는 단순 문자열 목록(좋아요/싫어요/은혜)은 중복만 빼고 합친다. */
function mergeStringList(a: string[] = [], b: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of [...a, ...b]) {
    if (!seen.has(s)) {
      seen.add(s);
      result.push(s);
    }
  }
  return result;
}

function mergePerson(a: Person, b: Person): Person {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    ...newer,
    notes: mergeNotes(a.notes, b.notes),
    gifts: mergeGifts(a.gifts ?? [], b.gifts ?? []),
    anniversaries: mergeAnniversaries(a.anniversaries ?? [], b.anniversaries ?? []),
    intentions: mergeIntentions(a.intentions ?? [], b.intentions ?? []),
    likes: mergeStringList(a.likes, b.likes),
    dislikes: mergeStringList(a.dislikes, b.dislikes),
    favors: mergeStringList(a.favors, b.favors),
    favorsGiven: mergeStringList(a.favorsGiven, b.favorsGiven),
    avoidTopics: mergeStringList(a.avoidTopics, b.avoidTopics),
    createdAt: Math.min(a.createdAt, b.createdAt),
  };
}

/** id로 중복만 빼고 합친다 — 내용이 바뀌지 않는(쓰고 나면 안 고치는) 항목용. */
function mergeByIdUnion<T extends { id: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

/** "오늘의 다짐"은 기기당 하나뿐이라 updatedAt이 없다 — date가 더 최근인(더 늦은) 쪽을 남긴다. */
function mergeDailyIntention(a?: DailyIntention, b?: DailyIntention): DailyIntention | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.date >= b.date ? a : b;
}

function mergeBook(a: Book, b: Book): Book {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return { ...newer, quotes: mergeStringList(a.quotes, b.quotes) };
}

/** 책도 사람처럼 id 기준으로 합치되, 글귀 목록은 양쪽 다 남긴다(합집합). */
function mergeBooks(a: Book[] = [], b: Book[] = []): Book[] {
  const byId = new Map<string, Book>();
  for (const book of a) byId.set(book.id, book);
  for (const book of b) {
    const existing = byId.get(book.id);
    byId.set(book.id, existing ? mergeBook(existing, book) : book);
  }
  return [...byId.values()];
}

export function mergeVaults(local: Vault, incoming: Vault): Vault {
  const byId = new Map<string, Person>();
  for (const person of local.people) byId.set(person.id, person);
  for (const person of incoming.people) {
    const existing = byId.get(person.id);
    byId.set(person.id, existing ? mergePerson(existing, person) : person);
  }

  const lastBackupAt = Math.max(local.lastBackupAt ?? 0, incoming.lastBackupAt ?? 0) || undefined;
  const customWisdom = mergeByIdUnion<CustomWisdom>(local.customWisdom ?? [], incoming.customWisdom ?? []);
  const groupNames = mergeStringList(local.groupNames, incoming.groupNames);
  const dailyIntention = mergeDailyIntention(local.dailyIntention, incoming.dailyIntention);
  const books = mergeBooks(local.books, incoming.books);

  return {
    version: Math.max(local.version, incoming.version),
    people: [...byId.values()].sort((a, b) => a.createdAt - b.createdAt),
    ...(lastBackupAt ? { lastBackupAt } : {}),
    ...(customWisdom.length ? { customWisdom } : {}),
    ...(groupNames.length ? { groupNames } : {}),
    ...(dailyIntention ? { dailyIntention } : {}),
    ...(books.length ? { books } : {}),
  };
}
