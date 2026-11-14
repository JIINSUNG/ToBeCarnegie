import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addMission, isMissionDone, missionStreak, removeMission, toggleMissionDone } from "./missions";

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
