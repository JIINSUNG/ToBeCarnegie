import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addAnniversary, createPerson, updatePerson } from "./people";
import { buildBriefing, relationshipTemp, shouldRemindBackup, staleContacts, upcomingAnniversaries, upcomingBirthdays } from "./derive";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 5, 15).getTime(); // 2026-06-15

describe("upcomingBirthdays", () => {
  it("withinDays 안의 생일만, 가까운 순서로 돌려준다", () => {
    let v = createPerson(emptyVault(), "오늘생일");
    v = updatePerson(v, v.people[0].id, { birthday: "06-15" });
    v = createPerson(v, "5일후생일");
    v = updatePerson(v, v.people[1].id, { birthday: "06-20" });
    v = createPerson(v, "먼생일");
    v = updatePerson(v, v.people[2].id, { birthday: "12-25" });

    const result = upcomingBirthdays(v, NOW, 14);
    expect(result.map((r) => r.person.name)).toEqual(["오늘생일", "5일후생일"]);
    expect(result[0].daysUntil).toBe(0);
    expect(result[1].daysUntil).toBe(5);
  });

  it("이미 지난 생일은 내년으로 계산한다", () => {
    let v = createPerson(emptyVault(), "지난생일");
    v = updatePerson(v, v.people[0].id, { birthday: "06-01" });
    expect(upcomingBirthdays(v, NOW, 14)).toEqual([]);
    expect(upcomingBirthdays(v, NOW, 400)).toHaveLength(1);
  });
});

describe("upcomingAnniversaries", () => {
  it("withinDays 안의 기념일만, 가까운 순서로 돌려주고 몇 년째인지 계산한다", () => {
    let v = createPerson(emptyVault(), "오늘기념일");
    v = addAnniversary(v, v.people[0].id, "처음 만난 날", "2020-06-15");
    v = createPerson(v, "5일후기념일");
    v = addAnniversary(v, v.people[1].id, "결혼기념일", "2021-06-20");
    v = createPerson(v, "먼기념일");
    v = addAnniversary(v, v.people[2].id, "계약일", "2019-12-25");

    const result = upcomingAnniversaries(v, NOW, 14);
    expect(result.map((r) => r.person.name)).toEqual(["오늘기념일", "5일후기념일"]);
    expect(result[0].daysUntil).toBe(0);
    expect(result[0].years).toBe(6);
    expect(result[1].daysUntil).toBe(5);
    expect(result[1].years).toBe(5);
  });

  it("이미 지난 기념일은 내년으로 계산한다", () => {
    let v = createPerson(emptyVault(), "지난기념일");
    v = addAnniversary(v, v.people[0].id, "어떤 날", "2022-06-01");
    expect(upcomingAnniversaries(v, NOW, 14)).toEqual([]);
    const far = upcomingAnniversaries(v, NOW, 400);
    expect(far).toHaveLength(1);
    expect(far[0].years).toBe(5);
  });
});

describe("relationshipTemp", () => {
  it("연락 기록이 없으면 unknown", () => {
    const v = createPerson(emptyVault(), "민수");
    expect(relationshipTemp(v.people[0], NOW)).toBe("unknown");
  });

  it("14일 이내면 warm, 60일 이내면 normal, 그 이상이면 cooling", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;

    v = updatePerson(v, id, { lastContactAt: NOW - 5 * DAY_MS });
    expect(relationshipTemp(v.people[0], NOW)).toBe("warm");

    v = updatePerson(v, id, { lastContactAt: NOW - 30 * DAY_MS });
    expect(relationshipTemp(v.people[0], NOW)).toBe("normal");

    v = updatePerson(v, id, { lastContactAt: NOW - 90 * DAY_MS });
    expect(relationshipTemp(v.people[0], NOW)).toBe("cooling");
  });
});

describe("staleContacts", () => {
  it("threshold 이상 연락이 없던 사람만, 오래된 순서로", () => {
    let v = createPerson(emptyVault(), "최근연락");
    v = updatePerson(v, v.people[0].id, { lastContactAt: NOW - 10 * DAY_MS });
    v = createPerson(v, "뜸한사람");
    v = updatePerson(v, v.people[1].id, { lastContactAt: NOW - 90 * DAY_MS });

    const result = staleContacts(v, NOW, 60);
    expect(result.map((r) => r.person.name)).toEqual(["뜸한사람"]);
    expect(result[0].daysSinceContact).toBe(90);
  });

  it("연락 기록이 아예 없으면 등록일을 기준으로 삼는다", () => {
    let v = createPerson(emptyVault(), "신규등록", "id1");
    v = { ...v, people: v.people.map((p) => ({ ...p, createdAt: NOW - 100 * DAY_MS })) };
    const result = staleContacts(v, NOW, 60);
    expect(result).toHaveLength(1);
    expect(result[0].daysSinceContact).toBe(100);
  });
});

describe("shouldRemindBackup", () => {
  it("사람이 없으면 알리지 않는다", () => {
    expect(shouldRemindBackup(emptyVault(), NOW)).toBe(false);
  });

  it("한 번도 백업 안 했고 사람이 있으면 알린다", () => {
    const v = createPerson(emptyVault(), "민수");
    expect(shouldRemindBackup(v, NOW)).toBe(true);
  });

  it("threshold 이내에 백업했으면 알리지 않고, 지났으면 알린다", () => {
    const v = { ...createPerson(emptyVault(), "민수"), lastBackupAt: NOW - 5 * DAY_MS };
    expect(shouldRemindBackup(v, NOW, 14)).toBe(false);

    const old = { ...v, lastBackupAt: NOW - 20 * DAY_MS };
    expect(shouldRemindBackup(old, NOW, 14)).toBe(true);
  });
});

describe("buildBriefing", () => {
  it("세 가지 파생값을 한 번에 묶는다", () => {
    const v = createPerson(emptyVault(), "민수");
    const briefing = buildBriefing(v, NOW);
    expect(briefing).toHaveProperty("upcomingBirthdays");
    expect(briefing).toHaveProperty("staleContacts");
    expect(briefing.shouldBackup).toBe(true);
  });
});
