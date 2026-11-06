// Vault 안의 Person 배열을 다루는 순수 함수들. 전부 "새 Vault를 돌려주는" 불변 업데이트 방식이라
// session.tsx의 update(fn)에 그대로 넘겨 쓸 수 있다.
import { nanoid } from "nanoid";
import type { Gift, Note, Person, Vault } from "../types";

/** id를 안 넘기면 새로 만든다. session.tsx의 update(fn) 안에서 쓸 땐, fn이 두 번 호출돼도(React
 * StrictMode) 같은 사람이 만들어지도록 id를 밖에서 미리 만들어 넘기는 쪽을 권장한다. */
export function createPerson(vault: Vault, name: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const person: Person = { id, name, tags: [], notes: [], gifts: [], createdAt: now, updatedAt: now };
  return { ...vault, people: [...vault.people, person] };
}

export function updatePerson(
  vault: Vault,
  id: string,
  patch: Partial<Pick<Person, "name" | "birthday" | "tags" | "lastContactAt">>
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

export function touchLastContact(vault: Vault, personId: string, at: number = Date.now()): Vault {
  return {
    ...vault,
    people: vault.people.map((p) => (p.id === personId ? { ...p, lastContactAt: at, updatedAt: Date.now() } : p)),
  };
}

export function findPerson(vault: Vault, id: string): Person | undefined {
  return vault.people.find((p) => p.id === id);
}

export function searchPeople(vault: Vault, query: string): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return vault.people;
  return vault.people.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.notes.some((n) => n.text.toLowerCase().includes(q))
  );
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
