// 두 Vault를 "항목(사람·기록·선물·기념일 등)별로 updatedAt이 더 최신인 쪽을 남기며" 합친다.
// 백업 복원(합치기)과 2단계 Firebase 동기화가 공용으로 쓴다.
// id가 있는 항목(notes/gifts/anniversaries)은 id 기준으로, id가 없는 단순 목록(likes 등)은
// 합집합으로 합친다 — 두 기기에서 각자 추가한 내용이 한쪽만 "더 최신"이라고 통째로 사라지지 않게.
import type { Anniversary, Book, CustomWisdom, DailyIntention, Gift, Goal, Intention, JournalEntry, Mission, MissionCount, Note, PeriodGoal, PeriodReflection, InfluenceStory, Person, Vault } from "../types";

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
    contacts: mergeById(a.contacts ?? [], b.contacts ?? []).sort((x, y) => x.at - y.at),
    followUps: mergeById(a.followUps ?? [], b.followUps ?? []).sort((x, y) => x.at - y.at),
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

/** 날짜별 완료 기록(미션·구호 체크) — 같은 날짜에 양쪽 기기가 각자 체크한 id를 합집합으로 합친다. */
function mergeDatedIdSet(a: Record<string, string[]> = {}, b: Record<string, string[]> = {}): Record<string, string[]> {
  const dates = new Set([...Object.keys(a), ...Object.keys(b)]);
  const result: Record<string, string[]> = {};
  for (const d of dates) result[d] = mergeStringList(a[d], b[d]);
  return result;
}

/** 미션은 문구·목표 횟수를 고칠 수 있어서, 같은 id면 더 최근에 고친 쪽(updatedAt, 없으면 createdAt)을 남긴다. */
function mergeMissions(a: Mission[] = [], b: Mission[] = []): Mission[] {
  const stamp = (m: Mission) => m.updatedAt ?? m.createdAt;
  const byId = new Map<string, Mission>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) {
    const existing = byId.get(m.id);
    if (!existing || stamp(m) > stamp(existing)) byId.set(m.id, m);
  }
  return [...byId.values()];
}

/** 횟수 미션의 날짜별 센 값 — 같은 날·같은 미션이면 마지막으로 바꾼(at이 큰) 쪽을 남긴다.
 * 합계나 최댓값으로 합치면 한쪽 기기에서 − 로 줄인 게 되살아나서, "최근 값 우선"으로 한다. */
function mergeMissionCounts(
  a: Record<string, Record<string, MissionCount>> = {},
  b: Record<string, Record<string, MissionCount>> = {}
): Record<string, Record<string, MissionCount>> {
  const result: Record<string, Record<string, MissionCount>> = {};
  for (const d of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const day: Record<string, MissionCount> = { ...a[d] };
    for (const [id, c] of Object.entries(b[d] ?? {})) {
      if (!day[id] || c.at > day[id].at) day[id] = c;
    }
    result[d] = day;
  }
  return result;
}

/** 삭제 기록 합치기 — 같은 id면 더 나중에 지운 시각. */
function mergeDeleted(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out = { ...a };
  for (const [id, at] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, at);
  return out;
}

/** 지운 뒤에 다른 기기에서 고친 게 아니면(updatedAt이 지운 시각 이전이면) 지운 것으로 본다. */
function alive<T extends { id: string; updatedAt: number }>(deleted: Record<string, number>) {
  return (x: T) => !(x.id in deleted) || x.updatedAt > deleted[x.id];
}

/** 기간 목표 — 문구·상태는 더 최근에 고친 쪽, 시도 기록은 양쪽 것을 id로 합친다(각 기기에서 따로 남긴 시도가 다 살게). */
function mergePeriodGoals(a: PeriodGoal[] = [], b: PeriodGoal[] = [], deleted: Record<string, number>): PeriodGoal[] {
  const byId = new Map<string, PeriodGoal>();
  for (const g of a) byId.set(g.id, g);
  for (const g of b) {
    const ex = byId.get(g.id);
    if (!ex) byId.set(g.id, g);
    else {
      const newer = g.updatedAt > ex.updatedAt ? g : ex;
      byId.set(g.id, { ...newer, attempts: mergeById(ex.attempts ?? [], g.attempts ?? []) });
    }
  }
  return [...byId.values()]
    .filter(alive(deleted))
    .map((g) => ({ ...g, attempts: (g.attempts ?? []).filter(alive(deleted)).sort((x, y) => x.at - y.at) }))
    .sort((x, y) => x.createdAt - y.createdAt);
}

export function mergeVaults(local: Vault, incoming: Vault): Vault {
  const deletedIds = mergeDeleted(local.deletedIds, incoming.deletedIds);
  const byId = new Map<string, Person>();
  for (const person of local.people) byId.set(person.id, person);
  for (const person of incoming.people) {
    const existing = byId.get(person.id);
    byId.set(person.id, existing ? mergePerson(existing, person) : person);
  }
  // 연락 기록·물어볼 것도 지운 건 되살리지 않는다.
  for (const [id, p] of byId) {
    if (!p.contacts && !p.followUps) continue;
    byId.set(id, {
      ...p,
      ...(p.contacts ? { contacts: p.contacts.filter(alive(deletedIds)) } : {}),
      ...(p.followUps ? { followUps: p.followUps.filter(alive(deletedIds)) } : {}),
    });
  }
  const periodGoals = mergePeriodGoals(local.periodGoals, incoming.periodGoals, deletedIds);
  const reflections = mergeById<PeriodReflection>(local.reflections ?? [], incoming.reflections ?? []).filter(alive(deletedIds));
  const stories = mergeById<InfluenceStory>(local.stories ?? [], incoming.stories ?? [])
    .filter(alive(deletedIds))
    .sort((x, y) => x.at - y.at);

  const lastBackupAt = Math.max(local.lastBackupAt ?? 0, incoming.lastBackupAt ?? 0) || undefined;
  const customWisdom = mergeByIdUnion<CustomWisdom>(local.customWisdom ?? [], incoming.customWisdom ?? []);
  const groupNames = mergeStringList(local.groupNames, incoming.groupNames);
  const dailyIntention = mergeDailyIntention(local.dailyIntention, incoming.dailyIntention);
  const books = mergeBooks(local.books, incoming.books);
  const missions = mergeMissions(local.missions, incoming.missions);
  const missionDone = mergeDatedIdSet(local.missionDone, incoming.missionDone);
  const missionCount = mergeMissionCounts(local.missionCount, incoming.missionCount);
  const journal = mergeByIdUnion<JournalEntry>(local.journal ?? [], incoming.journal ?? []);
  const affirmations = mergeByIdUnion<Mission>(local.affirmations ?? [], incoming.affirmations ?? []);
  const affirmationDone = mergeDatedIdSet(local.affirmationDone, incoming.affirmationDone);
  const goals = mergeById<Goal>(local.goals ?? [], incoming.goals ?? []);
  const improvements = mergeById<Goal>(local.improvements ?? [], incoming.improvements ?? []);

  return {
    version: Math.max(local.version, incoming.version),
    people: [...byId.values()].sort((a, b) => a.createdAt - b.createdAt),
    ...(lastBackupAt ? { lastBackupAt } : {}),
    ...(customWisdom.length ? { customWisdom } : {}),
    ...(groupNames.length ? { groupNames } : {}),
    ...(dailyIntention ? { dailyIntention } : {}),
    ...(books.length ? { books } : {}),
    ...(missions.length ? { missions } : {}),
    ...(Object.keys(missionDone).length ? { missionDone } : {}),
    ...(Object.keys(missionCount).length ? { missionCount } : {}),
    ...(journal.length ? { journal } : {}),
    ...(affirmations.length ? { affirmations } : {}),
    ...(Object.keys(affirmationDone).length ? { affirmationDone } : {}),
    ...(goals.length ? { goals } : {}),
    ...(improvements.length ? { improvements } : {}),
    ...(periodGoals.length ? { periodGoals } : {}),
    ...(reflections.length ? { reflections } : {}),
    ...(stories.length ? { stories } : {}),
    ...(Object.keys(deletedIds).length ? { deletedIds } : {}),
  };
}
