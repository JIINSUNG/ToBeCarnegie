import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addJournalEntry, JOURNAL_PROMPTS, pickJournalPrompt, removeJournalEntry } from "./journal";

describe("journal", () => {
  it("addJournalEntry로 일기를 추가하면 목록에 하나 늘어난다", () => {
    const v = addJournalEntry(emptyVault(), "오늘은 좋은 하루였다", "오늘 감사했던 일은?");
    expect(v.journal).toHaveLength(1);
    expect(v.journal![0].text).toBe("오늘은 좋은 하루였다");
    expect(v.journal![0].prompt).toBe("오늘 감사했던 일은?");
  });

  it("prompt 없이도 추가할 수 있다(자유롭게 쓴 글)", () => {
    const v = addJournalEntry(emptyVault(), "그냥 쓰고 싶어서 씀");
    expect(v.journal![0].prompt).toBeUndefined();
  });

  it("removeJournalEntry가 그 항목만 지운다", () => {
    let v = addJournalEntry(emptyVault(), "첫번째", undefined, "j1");
    v = addJournalEntry(v, "두번째", undefined, "j2");
    v = removeJournalEntry(v, "j1");
    expect(v.journal!.map((e) => e.id)).toEqual(["j2"]);
  });

  it("pickJournalPrompt는 항상 JOURNAL_PROMPTS 안의 질문을 돌려준다", () => {
    const picked = pickJournalPrompt();
    expect(JOURNAL_PROMPTS).toContain(picked);
  });

  it("pickJournalPrompt에 제외할 질문을 넘기면 다른 질문을 돌려준다(풀에 2개 이상 있을 때)", () => {
    const first = JOURNAL_PROMPTS[0];
    for (let i = 0; i < 20; i++) {
      expect(pickJournalPrompt(first)).not.toBe(first);
    }
  });
});
