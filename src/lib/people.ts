// Vault 안의 Person 배열을 다루는 순수 함수들. 전부 "새 Vault를 돌려주는" 불변 업데이트 방식이라
// session.tsx의 update(fn)에 그대로 넘겨 쓸 수 있다.
import { nanoid } from "nanoid";
import type { Anniversary, CustomWisdom, Gift, Intention, Note, Person, Vault } from "../types";

/** id를 안 넘기면 새로 만든다. session.tsx의 update(fn) 안에서 쓸 땐, fn이 두 번 호출돼도(React
 * StrictMode) 같은 사람이 만들어지도록 id를 밖에서 미리 만들어 넘기는 쪽을 권장한다. */
export function createPerson(vault: Vault, name: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const person: Person = {
    id,
    name,
    tags: [],
    notes: [],
    gifts: [],
    anniversaries: [],
    likes: [],
    dislikes: [],
    favors: [],
    intentions: [],
    createdAt: now,
    updatedAt: now,
  };
  return { ...vault, people: [...vault.people, person] };
}

export function updatePerson(
  vault: Vault,
  id: string,
  patch: Partial<Pick<Person, "name" | "birthday" | "tags" | "lastContactAt" | "mbti" | "groups">>
): Vault {
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
  };
}

export function deletePerson(vault: Vault, id: string): Vault {
  return { ...vault, people: vault.people.filter((p) => p.id !== id) };
}

export function addNote(vault: Vault, personId: string, text: string): Vault {
  const now = Date.now();
  const note: Note = { id: nanoid(), text, at: now, updatedAt: now };
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, notes: [...p.notes, note], updatedAt: now } : p)),
  };
}

export function updateNote(vault: Vault, personId: string, noteId: string, text: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId
        ? { ...p, notes: p.notes.map((n) => (n.id === noteId ? { ...n, text, updatedAt: now } : n)), updatedAt: now }
        : p
    ),
  };
}

export function deleteNote(vault: Vault, personId: string, noteId: string): Vault {
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId), updatedAt: Date.now() } : p
    ),
  };
}

export function addGift(vault: Vault, personId: string, text: string): Vault {
  const now = Date.now();
  const gift: Gift = { id: nanoid(), text, at: now, repaid: false, updatedAt: now };
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, gifts: [...(p.gifts ?? []), gift], updatedAt: now } : p)),
  };
}

export function toggleGiftRepaid(vault: Vault, personId: string, giftId: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId
        ? {
            ...p,
            gifts: (p.gifts ?? []).map((g) => (g.id === giftId ? { ...g, repaid: !g.repaid, repaidAt: !g.repaid ? now : undefined, updatedAt: now } : g)),
            updatedAt: now,
          }
        : p
    ),
  };
}

export function deleteGift(vault: Vault, personId: string, giftId: string): Vault {
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId ? { ...p, gifts: (p.gifts ?? []).filter((g) => g.id !== giftId), updatedAt: Date.now() } : p
    ),
  };
}

export function setGiftRepaidWith(vault: Vault, personId: string, giftId: string, repaidWith: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId
        ? { ...p, gifts: (p.gifts ?? []).map((g) => (g.id === giftId ? { ...g, repaidWith, updatedAt: now } : g)), updatedAt: now }
        : p
    ),
  };
}

export function addAnniversary(vault: Vault, personId: string, label: string, date: string): Vault {
  const now = Date.now();
  const anniversary: Anniversary = { id: nanoid(), label, date, updatedAt: now };
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, anniversaries: [...(p.anniversaries ?? []), anniversary], updatedAt: now } : p)),
  };
}

export function deleteAnniversary(vault: Vault, personId: string, anniversaryId: string): Vault {
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId ? { ...p, anniversaries: (p.anniversaries ?? []).filter((a) => a.id !== anniversaryId), updatedAt: Date.now() } : p
    ),
  };
}

export function addIntention(vault: Vault, personId: string, text: string): Vault {
  const now = Date.now();
  const intention: Intention = { id: nanoid(), text, at: now, updatedAt: now };
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, intentions: [...(p.intentions ?? []), intention], updatedAt: now } : p)),
  };
}

export function deleteIntention(vault: Vault, personId: string, intentionId: string): Vault {
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId ? { ...p, intentions: (p.intentions ?? []).filter((i) => i.id !== intentionId), updatedAt: Date.now() } : p
    ),
  };
}

type ListField = "likes" | "dislikes" | "favors";

function addToList(vault: Vault, personId: string, field: ListField, text: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, [field]: [...(p[field] ?? []), text], updatedAt: now } : p)),
  };
}

function removeFromList(vault: Vault, personId: string, field: ListField, index: number): Vault {
  return {
    ...vault,
    people: vault.people.map((p) =>
      p.id === personId ? { ...p, [field]: (p[field] ?? []).filter((_, i) => i !== index), updatedAt: Date.now() } : p
    ),
  };
}

export const addLike = (vault: Vault, personId: string, text: string) => addToList(vault, personId, "likes", text);
export const removeLike = (vault: Vault, personId: string, index: number) => removeFromList(vault, personId, "likes", index);
export const addDislike = (vault: Vault, personId: string, text: string) => addToList(vault, personId, "dislikes", text);
export const removeDislike = (vault: Vault, personId: string, index: number) => removeFromList(vault, personId, "dislikes", index);
export const addFavor = (vault: Vault, personId: string, text: string) => addToList(vault, personId, "favors", text);
export const removeFavor = (vault: Vault, personId: string, index: number) => removeFromList(vault, personId, "favors", index);

export function touchLastContact(vault: Vault, personId: string, at: number = Date.now()): Vault {
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, lastContactAt: at, updatedAt: Date.now() } : p)),
  };
}

/** "오늘 연락했어요"를 잘못 눌렀을 때 되돌리는 용도 — lastContactAt을 지정한 값(없으면 아예 기록
 * 없음)으로 되돌린다. */
export function setLastContact(vault: Vault, personId: string, at: number | undefined): Vault {
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, lastContactAt: at, updatedAt: Date.now() } : p)),
  };
}

export function findPerson(vault: Vault, id: string): Person | undefined {
  return vault.people.find((p) => p.id === id);
}

/** 이름이 정확히(대소문자 무시) 일치하는 사람들. 한 줄 빠른 기록이 누구 걸로 갈지 정할 때 쓴다. */
export function findPeopleByName(vault: Vault, name: string): Person[] {
  const n = name.trim().toLowerCase();
  if (!n) return [];
  return vault.people.filter((p) => p.name.trim().toLowerCase() === n);
}

export function searchPeople(vault: Vault, query: string): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return vault.people;
  const has = (t: string) => t.toLowerCase().includes(q);
  return vault.people.filter(
    (p) =>
      has(p.name) ||
      p.tags.some(has) ||
      p.notes.some((n) => has(n.text)) ||
      (p.gifts ?? []).some((g) => has(g.text) || has(g.repaidWith ?? "")) ||
      (p.anniversaries ?? []).some((a) => has(a.label)) ||
      (p.likes ?? []).some(has) ||
      (p.dislikes ?? []).some(has) ||
      (p.favors ?? []).some(has) ||
      (p.intentions ?? []).some((i) => has(i.text)) ||
      has(p.mbti ?? "") ||
      (p.groups ?? []).some(has)
  );
}

const MBTI_LETTERS: [string, string][] = [
  ["E", "I"],
  ["S", "N"],
  ["T", "F"],
  ["J", "P"],
];

/** 4글자 MBTI인지(대소문자 무시, 각 자리 둘 중 하나). */
export function isValidMbti(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (v.length !== 4) return false;
  return MBTI_LETTERS.every(([a, b], i) => v[i] === a || v[i] === b);
}

/** 지금까지 사람들에게 쓰인 그룹 이름 전부(중복 없이) — PersonEdit에서 고를 때, People에서 필터할 때 쓴다. */
export function allGroups(vault: Vault): string[] {
  const set = new Set<string>();
  for (const p of vault.people) for (const g of p.groups ?? []) set.add(g);
  return [...set].sort();
}

/** "MM-DD" 형식만 허용 — 유효한 달·일인지도 확인한다. */
export function isValidBirthday(value: string): boolean {
  const m = /^(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day >= 1 && day <= daysInMonth;
}

/** 기념일용 "YYYY-MM-DD" — 연도까지 포함한 실제 날짜인지 확인한다. */
export function isValidAnniversaryDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day >= 1 && day <= daysInMonth;
}

/** 홈 화면 "오늘의 한마디"에 섞여 나올 나만의 문구를 추가한다. */
export function addCustomWisdom(vault: Vault, text: string, id: string = nanoid()): Vault {
  const entry: CustomWisdom = { id, text, createdAt: Date.now() };
  return { ...vault, customWisdom: [...(vault.customWisdom ?? []), entry] };
}

export function removeCustomWisdom(vault: Vault, id: string): Vault {
  return { ...vault, customWisdom: (vault.customWisdom ?? []).filter((w) => w.id !== id) };
}

/** 오늘 하루만 유효한 다짐을 적어/고친다. date는 "YYYY-MM-DD"(기본 오늘). */
export function setDailyIntention(vault: Vault, text: string, date: string): Vault {
  return { ...vault, dailyIntention: { text, date } };
}

export function clearDailyIntention(vault: Vault): Vault {
  return { ...vault, dailyIntention: undefined };
}
