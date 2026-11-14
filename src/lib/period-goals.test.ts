import { describe, expect, it } from "vitest";
import { emptyVault, type Vault } from "../types";
import { periodKey, periodRange, periodRelative, periodTitle, shiftPeriod } from "./period";
import {
  addAttempt,
  addPeriodGoal,
  addStory,
  carryOver,
  deleteAttempt,
  deletePeriodGoal,
  deleteStory,
  editAttempt,
  findReflection,
  goalsFor,
  periodProgress,
  saveReflection,
  setGoalStatus,
  storiesFor,
} from "./period-goals";
import { mergeVaults } from "./merge";
import { createPerson } from "./people";
import { addContactLog, deleteContactLog } from "./contacts";

describe("기간 키", () => {
  it("연·월·ISO 주", () => {
    expect(periodKey("year", "2026-11-14")).toBe("2026");
    expect(periodKey("month", "2026-11-14")).toBe("2026-11");
    expect(periodKey("week", "2026-11-14")).toBe("2026-W46"); // 토요일
    expect(periodKey("week", "2026-11-09")).toBe("2026-W46"); // 월요일
    expect(periodKey("week", "2026-11-15")).toBe("2026-W46"); // 일요일
    expect(periodKey("week", "2027-01-01")).toBe("2026-W53"); // 연말 넘어가는 주
    expect(periodKey("week", "2026-01-01")).toBe("2026-W01");
  });

  it("범위·이동·표시", () => {
    expect(periodRange("week", "2026-W46")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
    expect(periodRange("month", "2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(shiftPeriod("week", "2026-W53", 1)).toBe("2027-W01");
    expect(shiftPeriod("month", "2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("year", "2026", -1)).toBe("2025");
    expect(periodTitle("week", "2026-W46")).toBe("11월 9일 ~ 15일");
    expect(periodTitle("week", "2026-W44")).toBe("10월 26일 ~ 11월 1일");
    expect(periodTitle("month", "2026-11")).toBe("2026년 11월");
    expect(periodRelative("week", "2026-W45", "2026-11-14")).toBe("지난주");
    expect(periodRelative("month", "2026-12", "2026-11-14")).toBe("다음 달");
    expect(periodRelative("year", "2026", "2026-11-14")).toBe("이번 해");
  });
});

describe("기간 목표·시도", () => {
  it("목표를 세우고 시도를 쌓고 상태를 바꾼다", () => {
    let v = addPeriodGoal(emptyVault(), "week", "2026-W46", " 매일 30분 걷기 ", "체력", "g1");
    v = addPeriodGoal(v, "week", "2026-W46", "책 1권", undefined, "g2");
    v = addAttempt(v, "g1", { did: "점심 산책", result: "20분", outcome: "meh", learned: "점심 전에 나가야" }, 1000, "a1");
    v = editAttempt(v, "g1", "a1", { did: "점심 산책", result: "30분 채움", outcome: "good" });
    v = setGoalStatus(v, "g1", "done");
    const goals = goalsFor(v, "week", "2026-W46");
    expect(goals.map((g) => g.id)).toEqual(["g2", "g1"]); // 진행 중이 위
    expect(goals[1].text).toBe("매일 30분 걷기");
    expect(goals[1].attempts[0]).toMatchObject({ result: "30분 채움", outcome: "good" });
    expect("learned" in goals[1].attempts[0]).toBe(false);
    expect(goals[1].doneAt).toBeTypeOf("number");
    expect(periodProgress(goals)).toEqual({ done: 1, total: 2 });
    v = setGoalStatus(v, "g2", "dropped");
    expect(periodProgress(goalsFor(v, "week", "2026-W46"))).toEqual({ done: 1, total: 1 });
  });

  it("다음 기간으로 넘기기", () => {
    let v = addPeriodGoal(emptyVault(), "month", "2026-11", "독서 2권", undefined, "g1");
    v = carryOver(v, "g1", "2026-12", "g2");
    expect(goalsFor(v, "month", "2026-12").map((g) => g.text)).toEqual(["독서 2권"]);
    expect(goalsFor(v, "month", "2026-11")).toHaveLength(1);
  });
});

describe("돌아보기", () => {
  it("저장·덮어쓰기·비우면 삭제", () => {
    let v = saveReflection(emptyVault(), "week", "2026-W46", { good: "꾸준함", bad: "", next: "" });
    v = saveReflection(v, "week", "2026-W46", { good: "꾸준함", bad: "늦잠", next: "알람" });
    expect(v.reflections).toHaveLength(1);
    expect(findReflection(v, "week", "2026-W46")?.bad).toBe("늦잠");
    v = saveReflection(v, "week", "2026-W46", { good: "", bad: "", next: "" });
    expect(findReflection(v, "week", "2026-W46")).toBeUndefined();
    expect(v.deletedIds?.["week:2026-W46"]).toBeTypeOf("number");
    v = saveReflection(v, "week", "2026-W46", { good: "다시", bad: "", next: "" });
    expect(findReflection(v, "week", "2026-W46")?.good).toBe("다시");
    expect(v.deletedIds?.["week:2026-W46"]).toBeUndefined();
  });
});

describe("영향·영감 노트", () => {
  it("종류·사람·검색으로 거른다", () => {
    let v = createPerson(emptyVault(), "민수", "p1");
    v = addStory(v, { kind: "received", text: "먼저 인사하는 모습", personId: "p1", lesson: "나도 먼저" }, 2, "s1");
    v = addStory(v, { kind: "gave", text: "후배 이력서 봐줌", who: "회사 후배" }, 3, "s2");
    expect(storiesFor(v).map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(storiesFor(v, { kind: "received" }).map((s) => s.id)).toEqual(["s1"]);
    expect(storiesFor(v, { personId: "p1" }).map((s) => s.id)).toEqual(["s1"]);
    expect(storiesFor(v, { q: "민수" }).map((s) => s.id)).toEqual(["s1"]);
    v = deleteStory(v, "s1");
    expect(storiesFor(v).map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("동기화 병합", () => {
  it("두 기기에서 같은 목표에 각자 남긴 시도가 모두 남는다", () => {
    const base = addPeriodGoal(emptyVault(), "week", "2026-W46", "걷기", undefined, "g1");
    const a = addAttempt(base, "g1", { did: "A기기" }, 1, "a1");
    const b = addAttempt(base, "g1", { did: "B기기" }, 2, "b1");
    const m = mergeVaults(a, b);
    expect(m.periodGoals![0].attempts.map((x) => x.id)).toEqual(["a1", "b1"]);
  });

  it("한 기기에서 지운 목표·시도·노트·연락 기록은 다른 기기 사본이 있어도 되살아나지 않는다", () => {
    let old: Vault = createPerson(emptyVault(), "민수", "p1");
    old = addPeriodGoal(old, "week", "2026-W46", "걷기", undefined, "g1");
    old = addPeriodGoal(old, "week", "2026-W46", "독서", undefined, "g2");
    old = addAttempt(old, "g2", { did: "10쪽" }, 1, "a1");
    old = addStory(old, { kind: "gave", text: "x" }, 1, "s1");
    old = addContactLog(old, "p1", "call", undefined, 1, "c1");
    // 조금 뒤에 지운다(지운 시각이 각 항목의 updatedAt보다 늦게)
    const later = Date.now() + 10;
    const realNow = Date.now;
    Date.now = () => later;
    let cur = deletePeriodGoal(old, "g1");
    cur = deleteAttempt(cur, "g2", "a1");
    cur = deleteStory(cur, "s1");
    cur = deleteContactLog(cur, "p1", "c1");
    Date.now = realNow;
    for (const m of [mergeVaults(cur, old), mergeVaults(old, cur)]) {
      expect(m.periodGoals!.map((g) => g.id)).toEqual(["g2"]);
      expect(m.periodGoals![0].attempts).toEqual([]);
      expect(m.stories ?? []).toEqual([]);
      expect(m.people[0].contacts).toEqual([]);
    }
  });
});
