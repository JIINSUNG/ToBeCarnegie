import { describe, expect, it } from "vitest";
import { consecutiveStreak, shiftDateStr } from "./streak";

describe("shiftDateStr", () => {
  it("날짜를 n일만큼 더하거나 뺀다(월 경계도 넘긴다)", () => {
    expect(shiftDateStr("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateStr("2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("consecutiveStreak", () => {
  it("오늘까지 연속으로 true인 날 수를 센다", () => {
    const done = new Set(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(consecutiveStreak("2026-01-03", (d) => done.has(d))).toBe(3);
  });

  it("오늘이 아직 안 됐으면 어제부터 거슬러 센다", () => {
    const done = new Set(["2026-01-01", "2026-01-02"]);
    expect(consecutiveStreak("2026-01-03", (d) => done.has(d))).toBe(2);
  });

  it("아무 날도 안 됐으면 0", () => {
    expect(consecutiveStreak("2026-01-03", () => false)).toBe(0);
  });
});
