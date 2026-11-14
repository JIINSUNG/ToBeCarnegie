import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addMission, formatMissionProgress, isMissionDone, missionCount, missionStreak, removeMission, stepMissionCount, toggleMissionDone, updateMission } from "./missions";

describe("missions", () => {
  it("addMission으로 미션을 추가하면 목록에 하나 늘어난다", () => {
    const v = addMission(emptyVault(), "하루에 한 사람에게 먼저 연락하기");
    expect(v.missions).toHaveLength(1);
    expect(v.missions![0].text).toBe("하루에 한 사람에게 먼저 연락하기");
  });

  it("removeMission이 그 미션만 지운다", () => {
    let v = addMission(emptyVault(), "미션1", "m1");
    v = addMission(v, "미션2", "m2");
    v = removeMission(v, "m1");
    expect(v.missions!.map((m) => m.id)).toEqual(["m2"]);
  });

  it("toggleMissionDone이 그 날짜의 완료 여부만 뒤집는다", () => {
    let v = addMission(emptyVault(), "미션1", "m1");
    expect(isMissionDone(v, "m1", "2026-01-01")).toBe(false);

    v = toggleMissionDone(v, "m1", "2026-01-01");
    expect(isMissionDone(v, "m1", "2026-01-01")).toBe(true);
    expect(isMissionDone(v, "m1", "2026-01-02")).toBe(false);

    v = toggleMissionDone(v, "m1", "2026-01-01");
    expect(isMissionDone(v, "m1", "2026-01-01")).toBe(false);
  });

  it("missionStreak은 오늘(또는 어제)부터 거슬러 연속 완료일을 센다", () => {
    let v = addMission(emptyVault(), "미션1", "m1");
    v = toggleMissionDone(v, "m1", "2026-01-01");
    v = toggleMissionDone(v, "m1", "2026-01-02");
    v = toggleMissionDone(v, "m1", "2026-01-03");
    // 1/4는 아직 체크 안 함 — 1/3까지 3일 연속
    expect(missionStreak(v, "m1", "2026-01-04")).toBe(3);

    v = toggleMissionDone(v, "m1", "2026-01-04");
    expect(missionStreak(v, "m1", "2026-01-04")).toBe(4);
  });

  it("중간에 하루라도 빠지면 그 이전 연속 기록은 안 센다", () => {
    let v = addMission(emptyVault(), "미션1", "m1");
    v = toggleMissionDone(v, "m1", "2026-01-01");
    // 1/2는 건너뜀
    v = toggleMissionDone(v, "m1", "2026-01-03");
    expect(missionStreak(v, "m1", "2026-01-03")).toBe(1);
  });
});

describe("횟수 미션", () => {
  const D = "2026-11-14";

  it("target을 주면 횟수 미션이 되고, 0·음수·소수는 정리된다", () => {
    let v = addMission(emptyVault(), "고객에게 연락", "m1", { target: 5, unit: " 명 " });
    expect(v.missions![0]).toMatchObject({ target: 5, unit: "명" });
    v = addMission(v, "물", "m2", { target: 0, unit: "잔" });
    expect(v.missions![1].target).toBeUndefined();
    expect(v.missions![1].unit).toBeUndefined();
    v = addMission(v, "책", "m3", { target: 2.7 });
    expect(v.missions![2].target).toBe(2);
  });

  it("+ / − 로 세고, target에 닿으면 달성", () => {
    let v = addMission(emptyVault(), "물 마시기", "m1", { target: 3, unit: "잔" });
    v = stepMissionCount(v, "m1", D, 1);
    v = stepMissionCount(v, "m1", D, 1);
    expect(missionCount(v, "m1", D)).toBe(2);
    expect(isMissionDone(v, "m1", D)).toBe(false);
    v = stepMissionCount(v, "m1", D, 1);
    expect(isMissionDone(v, "m1", D)).toBe(true);
    v = stepMissionCount(v, "m1", D, 1);
    expect(missionCount(v, "m1", D)).toBe(4); // 목표를 넘겨도 센다
    v = stepMissionCount(v, "m1", D, -1);
    v = stepMissionCount(v, "m1", D, -1);
    expect(isMissionDone(v, "m1", D)).toBe(false);
  });

  it("0 아래로는 안 내려간다", () => {
    let v = addMission(emptyVault(), "물", "m1", { target: 3 });
    v = stepMissionCount(v, "m1", D, -1);
    expect(missionCount(v, "m1", D)).toBe(0);
  });

  it("체크박스는 횟수 미션을 target까지 채우거나 0으로 되돌린다", () => {
    let v = addMission(emptyVault(), "물", "m1", { target: 5 });
    v = stepMissionCount(v, "m1", D, 2);
    v = toggleMissionDone(v, "m1", D);
    expect(missionCount(v, "m1", D)).toBe(5);
    v = toggleMissionDone(v, "m1", D);
    expect(missionCount(v, "m1", D)).toBe(0);
  });

  it("횟수 미션도 연속 달성일을 센다", () => {
    let v = addMission(emptyVault(), "물", "m1", { target: 2 });
    v = stepMissionCount(v, "m1", "2026-11-12", 2);
    v = stepMissionCount(v, "m1", "2026-11-13", 2);
    v = stepMissionCount(v, "m1", D, 1); // 오늘은 아직 덜 함
    expect(missionStreak(v, "m1", D)).toBe(2);
  });

  it("updateMission으로 목표를 바꾸거나 지워서 체크 미션으로 돌릴 수 있다", () => {
    let v = addMission(emptyVault(), "물", "m1", { target: 5, unit: "잔" });
    v = updateMission(v, "m1", "물 마시기", { target: 8, unit: "잔" });
    expect(v.missions![0]).toMatchObject({ text: "물 마시기", target: 8, unit: "잔" });
    v = updateMission(v, "m1", "물 마시기", {});
    expect("target" in v.missions![0]).toBe(false);
    expect("unit" in v.missions![0]).toBe(false);
  });

  it("formatMissionProgress", () => {
    expect(formatMissionProgress({ id: "m", text: "", target: 5, unit: "명", createdAt: 0 }, 3)).toBe("3 / 5명");
  });
});
