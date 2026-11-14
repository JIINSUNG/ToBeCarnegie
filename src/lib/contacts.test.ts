import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { createPerson, findPerson } from "./people";
import { addContactLog, addFollowUp, contactCountWithin, contactTimeline, deleteContactLog, deleteFollowUp, openFollowUps, toggleFollowUp, updateContactMemo } from "./contacts";
import { mergeVaults } from "./merge";

const base = () => createPerson(emptyVault(), "민수", "p1");

describe("연락 기록", () => {
  it("기록하면 타임라인에 쌓이고 lastContactAt이 최신으로 맞춰진다", () => {
    let v = addContactLog(base(), "p1", "call", "이직 얘기", 1000, "c1");
    v = addContactLog(v, "p1", "meet", "", 3000, "c2");
    v = addContactLog(v, "p1", "message", undefined, 2000, "c3"); // 지난 연락을 나중에 적어도
    const p = findPerson(v, "p1")!;
    expect(contactTimeline(p).map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
    expect(p.lastContactAt).toBe(3000);
    expect("memo" in p.contacts!.find((c) => c.id === "c2")!).toBe(false);
  });

  it("마지막 연락을 지우면 lastContactAt이 그 전 기록으로 돌아가고, 다 지우면 없어진다", () => {
    let v = addContactLog(base(), "p1", "call", undefined, 1000, "c1");
    v = addContactLog(v, "p1", "call", undefined, 2000, "c2");
    v = deleteContactLog(v, "p1", "c2");
    expect(findPerson(v, "p1")!.lastContactAt).toBe(1000);
    v = deleteContactLog(v, "p1", "c1");
    expect(findPerson(v, "p1")!.lastContactAt).toBeUndefined();
  });

  it("마지막이 아닌 기록을 지우면 lastContactAt은 그대로", () => {
    let v = addContactLog(base(), "p1", "call", undefined, 1000, "c1");
    v = addContactLog(v, "p1", "call", undefined, 2000, "c2");
    v = deleteContactLog(v, "p1", "c1");
    expect(findPerson(v, "p1")!.lastContactAt).toBe(2000);
  });

  it("메모를 고치거나 비울 수 있다", () => {
    let v = addContactLog(base(), "p1", "call", "a", 1000, "c1");
    v = updateContactMemo(v, "p1", "c1", "  b ");
    expect(findPerson(v, "p1")!.contacts![0].memo).toBe("b");
    v = updateContactMemo(v, "p1", "c1", "");
    expect("memo" in findPerson(v, "p1")!.contacts![0]).toBe(false);
  });

  it("contactCountWithin은 최근 n일 안의 연락만 센다", () => {
    const now = 100 * 86400000;
    let v = addContactLog(base(), "p1", "call", undefined, now - 5 * 86400000);
    v = addContactLog(v, "p1", "call", undefined, now - 40 * 86400000);
    expect(contactCountWithin(findPerson(v, "p1")!, 30, now)).toBe(1);
  });

  it("두 기기에서 각자 남긴 연락 기록이 병합 때 둘 다 남는다", () => {
    const a = addContactLog(base(), "p1", "call", undefined, 1000, "c1");
    const b = addContactLog(base(), "p1", "meet", undefined, 2000, "c2");
    expect(findPerson(mergeVaults(a, b), "p1")!.contacts!.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("다음에 물어볼 것", () => {
  it("추가·체크·해제·삭제", () => {
    let v = addFollowUp(base(), "p1", "이사 잘 했는지", "f1");
    v = addFollowUp(v, "p1", "시험 결과", "f2");
    expect(openFollowUps(findPerson(v, "p1")!).map((f) => f.id)).toEqual(["f1", "f2"]);
    v = toggleFollowUp(v, "p1", "f1");
    const f1 = findPerson(v, "p1")!.followUps!.find((f) => f.id === "f1")!;
    expect(f1.done).toBe(true);
    expect(f1.doneAt).toBeTypeOf("number");
    expect(openFollowUps(findPerson(v, "p1")!).map((f) => f.id)).toEqual(["f2"]);
    v = toggleFollowUp(v, "p1", "f1");
    expect("doneAt" in findPerson(v, "p1")!.followUps!.find((f) => f.id === "f1")!).toBe(false);
    v = deleteFollowUp(v, "p1", "f2");
    expect(findPerson(v, "p1")!.followUps!.map((f) => f.id)).toEqual(["f1"]);
  });
});
