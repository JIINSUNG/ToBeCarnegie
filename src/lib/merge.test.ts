import { describe, expect, it } from "vitest";
import { emptyVault, type Vault } from "../types";
import { addAvoidTopic, addFavor, addFavorGiven, addGift, addIntention, addLike, addNote, createPerson, findPerson, updatePerson } from "./people";
import { addBook, addBookQuote, findBook, updateBook } from "./books";
import { mergeVaults } from "./merge";

function withPerson(vault: Vault, name: string, id: string): Vault {
  return createPerson(vault, name, id);
}

describe("mergeVaults", () => {
  it("한쪽에만 있는 사람은 그대로 들어간다", () => {
    const local = withPerson(emptyVault(), "민수", "p1");
    const incoming = withPerson(emptyVault(), "지은", "p2");
    const merged = mergeVaults(local, incoming);
    expect(merged.people.map((p) => p.name).sort()).toEqual(["민수", "지은"]);
  });

  it("같은 사람이 양쪽에 있으면 updatedAt이 더 최신인 쪽 필드를 쓴다", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = updatePerson(local, "p1", { name: "민수(로컬)" });

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = { ...incoming, people: [{ ...incoming.people[0], name: "민수(원격)", updatedAt: local.people[0].updatedAt + 1000 }] };

    const merged = mergeVaults(local, incoming);
    expect(findPerson(merged, "p1")?.name).toBe("민수(원격)");
  });

  it("같은 사람의 기록은 노트 단위로 합쳐진다 (둘 다 남고 중복 id는 최신으로)", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = addNote(local, "p1", "로컬 기록");
    const localNoteId = findPerson(local, "p1")!.notes[0].id;

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = addNote(incoming, "p1", "원격 기록");

    const merged = mergeVaults(local, incoming);
    const texts = findPerson(merged, "p1")!.notes.map((n) => n.text).sort();
    expect(texts).toEqual(["로컬 기록", "원격 기록"]);
    expect(localNoteId).toBeTruthy();
  });

  it("선물도 노트처럼 id 단위로 합쳐진다 (둘 다 남음)", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = addGift(local, "p1", "로컬에서 받은 선물");

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = addGift(incoming, "p1", "원격에서 받은 선물");

    const merged = mergeVaults(local, incoming);
    const texts = findPerson(merged, "p1")!.gifts!.map((g) => g.text).sort();
    expect(texts).toEqual(["로컬에서 받은 선물", "원격에서 받은 선물"]);
  });

  it("좋아요처럼 id 없는 목록은 중복만 빼고 합쳐진다 (한쪽만 남지 않음)", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = addLike(local, "p1", "커피");
    local = addFavor(local, "p1", "이사 도와줌");

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = addLike(incoming, "p1", "영화");
    incoming = { ...incoming, people: incoming.people.map((p) => ({ ...p, updatedAt: local.people[0].updatedAt + 1000 })) };

    const merged = mergeVaults(local, incoming);
    expect(findPerson(merged, "p1")?.likes?.sort()).toEqual(["영화", "커피"]);
    expect(findPerson(merged, "p1")?.favors).toEqual(["이사 도와줌"]);
  });

  it("베푼 호의·피해야 할 주제도 좋아요처럼 중복만 빼고 합쳐진다", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = addFavorGiven(local, "p1", "로컬에서 베푼 호의");
    local = addAvoidTopic(local, "p1", "최근 이혼함");

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = addFavorGiven(incoming, "p1", "원격에서 베푼 호의");

    const merged = mergeVaults(local, incoming);
    expect(findPerson(merged, "p1")?.favorsGiven?.sort()).toEqual(["로컬에서 베푼 호의", "원격에서 베푼 호의"]);
    expect(findPerson(merged, "p1")?.avoidTopics).toEqual(["최근 이혼함"]);
  });

  it("다짐도 노트처럼 id 단위로 합쳐진다 (둘 다 남음)", () => {
    let local = withPerson(emptyVault(), "민수", "p1");
    local = addIntention(local, "p1", "로컬에서 쓴 다짐");

    let incoming = withPerson(emptyVault(), "민수", "p1");
    incoming = addIntention(incoming, "p1", "원격에서 쓴 다짐");

    const merged = mergeVaults(local, incoming);
    const texts = findPerson(merged, "p1")!.intentions!.map((i) => i.text).sort();
    expect(texts).toEqual(["로컬에서 쓴 다짐", "원격에서 쓴 다짐"]);
  });

  it("version과 lastBackupAt은 더 큰 쪽을 쓴다", () => {
    const local: Vault = { version: 1, people: [], lastBackupAt: 100 };
    const incoming: Vault = { version: 2, people: [], lastBackupAt: 50 };
    const merged = mergeVaults(local, incoming);
    expect(merged.version).toBe(2);
    expect(merged.lastBackupAt).toBe(100);
  });

  it("나만의 문구·그룹 등록부·오늘의 다짐도 양쪽 걸 합쳐서 남긴다(동기화 때 사라지면 안 됨)", () => {
    const local: Vault = {
      version: 1,
      people: [],
      customWisdom: [{ id: "w1", text: "로컬 문구", createdAt: 1 }],
      groupNames: ["헬스장"],
      dailyIntention: { text: "로컬 다짐", date: "2026-01-01" },
    };
    const incoming: Vault = {
      version: 1,
      people: [],
      customWisdom: [{ id: "w2", text: "원격 문구", createdAt: 2 }],
      groupNames: ["동호회"],
      dailyIntention: { text: "원격 다짐", date: "2026-01-02" },
    };
    const merged = mergeVaults(local, incoming);
    expect(merged.customWisdom?.map((w) => w.id).sort()).toEqual(["w1", "w2"]);
    expect(merged.groupNames?.sort()).toEqual(["동호회", "헬스장"]);
    expect(merged.dailyIntention).toEqual({ text: "원격 다짐", date: "2026-01-02" });
  });

  it("책은 id 기준으로 합치고(더 최신 쪽 필드), 글귀는 양쪽 다 남긴다", () => {
    let local = addBook(emptyVault(), "인간관계론", "데일 카네기", "b1");
    local = addBookQuote(local, "b1", "로컬에서 뽑은 글귀");
    local = updateBook(local, "b1", { rating: 3 });

    let incoming = addBook(emptyVault(), "인간관계론", "데일 카네기", "b1");
    incoming = addBookQuote(incoming, "b1", "원격에서 뽑은 글귀");
    incoming = { ...incoming, books: incoming.books!.map((b) => ({ ...b, updatedAt: local.books![0].updatedAt + 1000, rating: 5 })) };

    const merged = mergeVaults(local, incoming);
    const book = findBook(merged, "b1");
    expect(book?.rating).toBe(5);
    expect(book?.quotes?.sort()).toEqual(["로컬에서 뽑은 글귀", "원격에서 뽑은 글귀"]);
  });
});
