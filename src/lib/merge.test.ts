import { describe, expect, it } from "vitest";
import { emptyVault, type Vault } from "../types";
import { addAvoidTopic, addFavor, addFavorGiven, addGift, addIntention, addLike, addNote, createPerson, findPerson, updatePerson } from "./people";
import { addBook, addBookQuote, findBook, updateBook } from "./books";
import { addMission, toggleMissionDone } from "./missions";
import { addJournalEntry } from "./journal";
import { addAffirmation, toggleAffirmationDone } from "./affirmations";
import { addGoal, toggleGoalDone } from "./goals";
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

  it("미션·성장 일기는 양쪽 다 남고, 같은 날짜의 미션 체크는 합쳐진다", () => {
    let local = addMission(emptyVault(), "로컬 미션", "m1");
    local = toggleMissionDone(local, "m1", "2026-01-01");
    local = addJournalEntry(local, "로컬 일기", undefined, "j1");

    let incoming = addMission(emptyVault(), "원격 미션", "m2");
    incoming = toggleMissionDone(incoming, "m2", "2026-01-01");
    incoming = addJournalEntry(incoming, "원격 일기", undefined, "j2");

    const merged = mergeVaults(local, incoming);
    expect(merged.missions?.map((m) => m.id).sort()).toEqual(["m1", "m2"]);
    expect(merged.journal?.map((e) => e.id).sort()).toEqual(["j1", "j2"]);
    expect(merged.missionDone?.["2026-01-01"]?.sort()).toEqual(["m1", "m2"]);
  });

  it("구호는 미션처럼 양쪽 다 남고 같은 날짜 체크는 합쳐진다", () => {
    let local = addAffirmation(emptyVault(), "로컬 구호", "a1");
    local = toggleAffirmationDone(local, "a1", "2026-01-01");

    let incoming = addAffirmation(emptyVault(), "원격 구호", "a2");
    incoming = toggleAffirmationDone(incoming, "a2", "2026-01-01");

    const merged = mergeVaults(local, incoming);
    expect(merged.affirmations?.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
    expect(merged.affirmationDone?.["2026-01-01"]?.sort()).toEqual(["a1", "a2"]);
  });

  it("목표·고치고 싶은 점은 id 기준으로 합치고, 더 최신 쪽(done 등)을 남긴다", () => {
    let local = addGoal(emptyVault(), "goals", "목표1", "g1");
    local = addGoal(local, "improvements", "고칠점1", "i1");

    let incoming = addGoal(emptyVault(), "goals", "목표1", "g1");
    incoming = toggleGoalDone(incoming, "goals", "g1"); // 원격에서 달성 처리
    // 테스트 환경에서는 local/incoming 생성이 같은 밀리초에 몰릴 수 있어, updatedAt을 확실히 더
    // 최신으로 만들어 "원격이 더 최신" 상황을 재현한다.
    incoming = { ...incoming, goals: incoming.goals!.map((g) => ({ ...g, updatedAt: g.updatedAt + 1000 })) };

    const merged = mergeVaults(local, incoming);
    expect(merged.goals?.find((g) => g.id === "g1")?.done).toBe(true);
    expect(merged.improvements?.map((g) => g.id)).toEqual(["i1"]);
  });
});

describe("mergeVaults — 횟수 미션", () => {
  it("같은 날 같은 미션의 센 값은 마지막으로 바꾼 쪽을 남긴다(줄인 것도 살아남게)", () => {
    const local = { version: 1, people: [], missionCount: { "2026-11-14": { m1: { n: 4, at: 10 } } } };
    const incoming = { version: 1, people: [], missionCount: { "2026-11-14": { m1: { n: 2, at: 20 }, m2: { n: 1, at: 5 } } } };
    const merged = mergeVaults(local, incoming);
    expect(merged.missionCount!["2026-11-14"]).toEqual({ m1: { n: 2, at: 20 }, m2: { n: 1, at: 5 } });
  });

  it("미션 목표를 고친 쪽(updatedAt이 큰 쪽)이 남는다", () => {
    const local = { version: 1, people: [], missions: [{ id: "m1", text: "물", target: 5, createdAt: 1, updatedAt: 1 }] };
    const incoming = { version: 1, people: [], missions: [{ id: "m1", text: "물", target: 8, createdAt: 1, updatedAt: 9 }] };
    expect(mergeVaults(local, incoming).missions![0].target).toBe(8);
    expect(mergeVaults(incoming, local).missions![0].target).toBe(8);
  });
});
