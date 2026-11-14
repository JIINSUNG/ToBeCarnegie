import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addAffirmation, affirmationStreak, isAffirmationDone, removeAffirmation, toggleAffirmationDone } from "./affirmations";

describe("affirmations", () => {
  it("addAffirmation으로 구호를 추가하면 목록에 하나 늘어난다", () => {
    const v = addAffirmation(emptyVault(), "나는 나를 좋아한다");
    expect(v.affirmations).toHaveLength(1);
    expect(v.affirmations![0].text).toBe("나는 나를 좋아한다");
  });

  it("toggleAffirmationDone이 그 날짜의 완료 여부만 뒤집는다", () => {
    let v = addAffirmation(emptyVault(), "구호1", "a1");
    expect(isAffirmationDone(v, "a1", "2026-01-01")).toBe(false);
    v = toggleAffirmationDone(v, "a1", "2026-01-01");
    expect(isAffirmationDone(v, "a1", "2026-01-01")).toBe(true);
  });

  it("affirmationStreak이 연속 완료일을 센다", () => {
    let v = addAffirmation(emptyVault(), "구호1", "a1");
    v = toggleAffirmationDone(v, "a1", "2026-01-01");
    v = toggleAffirmationDone(v, "a1", "2026-01-02");
    expect(affirmationStreak(v, "a1", "2026-01-03")).toBe(2);
  });

  it("removeAffirmation이 그 항목만 지운다", () => {
    let v = addAffirmation(emptyVault(), "구호1", "a1");
    v = addAffirmation(v, "구호2", "a2");
    v = removeAffirmation(v, "a1");
    expect(v.affirmations!.map((a) => a.id)).toEqual(["a2"]);
  });
});
