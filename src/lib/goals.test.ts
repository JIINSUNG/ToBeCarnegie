import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addGoal, removeGoal, toggleGoalDone } from "./goals";

describe("goals", () => {
  it("addGoal로 목표를 추가하면 goals 필드에 하나 늘어난다", () => {
    const v = addGoal(emptyVault(), "goals", "1년 안에 5kg 감량하기");
    expect(v.goals).toHaveLength(1);
    expect(v.goals![0].done).toBe(false);
  });

  it("field를 improvements로 주면 improvements 필드를 쓴다(goals는 안 건드림)", () => {
    const v = addGoal(emptyVault(), "improvements", "약속 시간에 늦지 않기");
    expect(v.improvements).toHaveLength(1);
    expect(v.goals ?? []).toHaveLength(0);
  });

  it("toggleGoalDone이 done과 achievedAt을 같이 뒤집는다", () => {
    let v = addGoal(emptyVault(), "goals", "목표1", "g1");
    v = toggleGoalDone(v, "goals", "g1");
    expect(v.goals![0].done).toBe(true);
    expect(v.goals![0].achievedAt).toBeTypeOf("number");

    v = toggleGoalDone(v, "goals", "g1");
    expect(v.goals![0].done).toBe(false);
    expect(v.goals![0].achievedAt).toBeUndefined();
  });

  it("removeGoal이 그 항목만 지운다", () => {
    let v = addGoal(emptyVault(), "goals", "목표1", "g1");
    v = addGoal(v, "goals", "목표2", "g2");
    v = removeGoal(v, "goals", "g1");
    expect(v.goals!.map((g) => g.id)).toEqual(["g2"]);
  });
});
