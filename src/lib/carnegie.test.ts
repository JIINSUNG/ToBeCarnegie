import { describe, expect, it } from "vitest";
import { emptyVault, type Vault } from "../types";
import { addPractice, choosePrinciple, deletePractice, practiceCounts, practicesFor, principleFor, PRINCIPLES, suggestPrinciple } from "./principles";
import { addAppreciation, appreciationsFor, appreciationsToday, deleteAppreciation, quietAppreciation, toggleExpressed } from "./appreciations";
import { buildMeetBrief } from "./meet-brief";
import { addAvoidTopic, addGift, addLike, addNote, createPerson, updatePerson } from "./people";
import { addContactLog, addFollowUp } from "./contacts";
import { mergeVaults } from "./merge";

const DAY = 86400000;

describe("카네기 원칙", () => {
  it("원칙 30개, id가 겹치지 않는다", () => {
    expect(PRINCIPLES).toHaveLength(30);
    expect(new Set(PRINCIPLES.map((p) => p.id)).size).toBe(30);
  });

  it("주마다 원칙을 고르고, 다시 고르면 바뀐다", () => {
    let v = choosePrinciple(emptyVault(), "2026-W46", "p6");
    expect(principleFor(v, "2026-W46")?.id).toBe("p6");
    v = choosePrinciple(v, "2026-W46", "p7");
    expect(principleFor(v, "2026-W46")?.id).toBe("p7");
    expect(v.principleWeeks).toHaveLength(1);
    expect(principleFor(v, "2026-W47")).toBeUndefined();
  });

  it("추천은 덜 해본·안 골라본 원칙에서, 같은 주엔 늘 같은 걸", () => {
    let v: Vault = emptyVault();
    for (const p of PRINCIPLES.slice(0, 29)) v = addPractice(v, "2026-W40", p.id, "했음");
    expect(suggestPrinciple(v, "2026-W46").id).toBe("p30");
    const fresh = emptyVault();
    expect(suggestPrinciple(fresh, "2026-W46").id).toBe(suggestPrinciple(fresh, "2026-W46").id);
    // 지난주에 고른 원칙은 추천에서 빠진다
    const chosen = choosePrinciple(fresh, "2026-W45", suggestPrinciple(fresh, "2026-W46").id);
    expect(suggestPrinciple(chosen, "2026-W46").id).not.toBe(suggestPrinciple(fresh, "2026-W46").id);
  });

  it("실천 기록·횟수·삭제", () => {
    let v = createPerson(emptyVault(), "민수", "m");
    v = addPractice(v, "2026-W46", "p6", " 이름 불러줌 ", "m", 2, "a");
    v = addPractice(v, "2026-W46", "p6", "또", undefined, 3, "b");
    expect(practicesFor(v, { weekKey: "2026-W46" }).map((x) => x.id)).toEqual(["b", "a"]);
    expect(practicesFor(v, { personId: "m" })[0].text).toBe("이름 불러줌");
    expect(practiceCounts(v)).toEqual({ p6: 2 });
    v = deletePractice(v, "a");
    expect(practiceCounts(v)).toEqual({ p6: 1 });
  });
});

describe("감사·칭찬", () => {
  it("추가·표현 토글·사람별·오늘 수·삭제", () => {
    const now = new Date(2026, 10, 14, 15).getTime();
    let v = createPerson(emptyVault(), "민수", "m");
    v = addAppreciation(v, { kind: "thanks", text: "우산 빌려줌", personId: "m", who: "무시됨" }, now, "a");
    v = addAppreciation(v, { kind: "praise", text: "발표 잘함", who: " 후배 " }, now - DAY, "b");
    expect(appreciationsFor(v, { personId: "m" }).map((a) => a.id)).toEqual(["a"]);
    expect("who" in appreciationsFor(v, { personId: "m" })[0]).toBe(false);
    expect(appreciationsFor(v, { kind: "praise" })[0].who).toBe("후배");
    expect(appreciationsToday(v, now)).toBe(1);
    v = toggleExpressed(v, "a");
    expect(appreciationsFor(v)[0].expressed).toBe(true);
    v = toggleExpressed(v, "a");
    expect("expressed" in appreciationsFor(v)[0]).toBe(false);
    v = deleteAppreciation(v, "a");
    expect(appreciationsFor(v).map((a) => a.id)).toEqual(["b"]);
  });

  it("최근 연락하는데 고마움 표현이 오래된 사람", () => {
    const now = 1000 * DAY;
    let v = createPerson(emptyVault(), "가", "a");
    v = createPerson(v, "나", "b");
    v = createPerson(v, "다", "c");
    v = createPerson(v, "라", "d");
    v = addContactLog(v, "a", "call", undefined, now - 5 * DAY);
    v = addContactLog(v, "b", "call", undefined, now - 5 * DAY);
    v = addContactLog(v, "c", "call", undefined, now - 5 * DAY);
    v = addContactLog(v, "d", "call", undefined, now - 200 * DAY); // 연락 자체가 뜸 → 제외
    v = addAppreciation(v, { kind: "thanks", text: "x", personId: "a" }, now - 10 * DAY); // 최근 표현 → 제외
    v = addAppreciation(v, { kind: "thanks", text: "x", personId: "b" }, now - 80 * DAY);
    expect(quietAppreciation(v, now).map((q) => [q.person.id, q.daysSince])).toEqual([
      ["c", null],
      ["b", 80],
    ]);
  });
});

describe("만나기 전 브리핑", () => {
  it("필요한 것만 모은다", () => {
    const now = new Date(2026, 10, 14, 12).getTime();
    let v = createPerson(emptyVault(), "민수", "m");
    v = updatePerson(v, "m", { honorific: "형 · 반말", birthday: "12-01" });
    v = addAvoidTopic(v, "m", "이직 실패");
    v = addLike(v, "m", "아이스 아메리카노");
    v = addNote(v, "m", "딸 돌잔치 준비 중");
    v = addFollowUp(v, "m", "돌잔치 잘 했는지");
    v = addContactLog(v, "m", "meet", "등산", now - 3 * DAY, "c1");
    v = addGift(v, "m", "커피 기프티콘", "received");
    v = addAppreciation(v, { kind: "thanks", text: "이사 도와줌", personId: "m" }, now - DAY);
    const b = buildMeetBrief(v, "m", now)!;
    expect(b.empty).toBe(false);
    expect(b.lastContact?.id).toBe("c1");
    expect(b.followUps.map((f) => f.text)).toEqual(["돌잔치 잘 했는지"]);
    expect(b.avoidTopics).toEqual(["이직 실패"]);
    expect(b.upcoming).toEqual([{ label: "생일", daysUntil: 17 }]);
    expect(b.unrepaidGifts).toHaveLength(1);
    expect(b.lastAppreciation?.text).toBe("이사 도와줌");
  });

  it("아무것도 없으면 empty", () => {
    expect(buildMeetBrief(createPerson(emptyVault(), "새", "n"), "n")!.empty).toBe(true);
    expect(buildMeetBrief(emptyVault(), "x")).toBeNull();
  });
});

describe("동기화 병합", () => {
  it("원칙·실천·감사 기록이 합쳐지고, 지운 건 안 살아난다", () => {
    const base = choosePrinciple(addPractice(addAppreciation(emptyVault(), { kind: "thanks", text: "t" }, 1, "ap"), "2026-W46", "p1", "x", undefined, 1, "pr"), "2026-W46", "p1");
    const realNow = Date.now;
    Date.now = () => realNow() + 10;
    const a = deletePractice(deleteAppreciation(base, "ap"), "pr");
    Date.now = realNow;
    const b = addAppreciation(base, { kind: "praise", text: "new" }, 2, "ap2");
    for (const m of [mergeVaults(a, b), mergeVaults(b, a)]) {
      expect((m.appreciations ?? []).map((x) => x.id)).toEqual(["ap2"]);
      expect(m.principlePractices ?? []).toEqual([]);
      expect(m.principleWeeks).toHaveLength(1);
    }
  });
});
