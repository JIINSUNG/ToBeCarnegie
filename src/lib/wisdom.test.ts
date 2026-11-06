import { describe, expect, it } from "vitest";
import { pickRandomWisdom, pickWisdomForPerson, relevantTagsForPerson, WISDOM } from "./wisdom";
import { createPerson } from "./people";
import { emptyVault } from "../types";

describe("WISDOM", () => {
  it("문구가 충분히 많고(데이터가 빈약하지 않고), 전부 비어있지 않다", () => {
    expect(WISDOM.length).toBeGreaterThanOrEqual(30);
    for (const w of WISDOM) {
      expect(w.text.trim().length).toBeGreaterThan(0);
      expect(w.tags.length).toBeGreaterThan(0);
    }
  });

  it("id가 전부 서로 다르다", () => {
    const ids = new Set(WISDOM.map((w) => w.id));
    expect(ids.size).toBe(WISDOM.length);
  });
});

describe("pickRandomWisdom", () => {
  it("항상 WISDOM 목록 안의 문구를 돌려준다", () => {
    for (let i = 0; i < 20; i++) {
      const w = pickRandomWisdom();
      expect(WISDOM.some((x) => x.id === w.id)).toBe(true);
    }
  });

  it("excludeId를 주면 그 문구는 안 나온다", () => {
    for (let i = 0; i < 20; i++) {
      const w = pickRandomWisdom("w1");
      expect(w.id).not.toBe("w1");
    }
  });
});

describe("relevantTagsForPerson", () => {
  const NOW = Date.now();

  it("안 갚은 선물이 있으면 보답/감사 태그가 포함된다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = { ...v, people: v.people.map((p) => (p.id === id ? { ...p, gifts: [{ id: "g1", text: "선물", at: NOW, repaid: false, updatedAt: NOW }] } : p)) };
    const tags = relevantTagsForPerson(v.people[0], NOW);
    expect(tags).toContain("보답");
    expect(tags).toContain("감사");
  });

  it("연락이 뜸하거나 기록이 없으면 연락/꾸준함 태그가 포함된다", () => {
    const v = createPerson(emptyVault(), "민수");
    const tags = relevantTagsForPerson(v.people[0], NOW); // lastContactAt 없음 -> unknown
    expect(tags).toContain("연락");
    expect(tags).toContain("꾸준함");
  });

  it("최근에 연락했으면 경청/관심/칭찬 태그가 포함된다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = { ...v, people: v.people.map((p) => (p.id === id ? { ...p, lastContactAt: NOW - 1000 } : p)) };
    const tags = relevantTagsForPerson(v.people[0], NOW);
    expect(tags).toContain("경청");
    expect(tags).toContain("칭찬");
  });
});

describe("pickWisdomForPerson", () => {
  it("같은 사람·같은 시점이면 항상 같은 문구를 고른다(매번 안 바뀜)", () => {
    const v = createPerson(emptyVault(), "민수", "fixed-id-1");
    const now = Date.now();
    const a = pickWisdomForPerson(v.people[0], now);
    const b = pickWisdomForPerson(v.people[0], now);
    expect(a.id).toBe(b.id);
  });

  it("고른 문구는 WISDOM 목록 안에 있다", () => {
    const v = createPerson(emptyVault(), "민수");
    const w = pickWisdomForPerson(v.people[0]);
    expect(WISDOM.some((x) => x.id === w.id)).toBe(true);
  });
});
