// 성장 일기 — 프롬프트에 답하거나 자유롭게 쓴 짧은 회고.
import { nanoid } from "nanoid";
import type { JournalEntry, Vault } from "../types";

/** 돌아가며 보여줄 질문들 — 매번 백지에서 시작하지 않아도 되게. */
export const JOURNAL_PROMPTS = [
  "오늘 감사했던 일은?",
  "오늘 배운 점은?",
  "오늘 나는 어떤 점에서 어제보다 나아졌나?",
  "오늘 누군가에게 받은 좋은 영향은?",
  "오늘 스스로를 칭찬하고 싶은 순간은?",
  "오늘 아쉬웠던 점과, 다음엔 어떻게 하고 싶은지?",
];

export function pickJournalPrompt(excludePrompt?: string): string {
  const pool = excludePrompt ? JOURNAL_PROMPTS.filter((p) => p !== excludePrompt) : JOURNAL_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function addJournalEntry(vault: Vault, text: string, prompt?: string, id: string = nanoid()): Vault {
  const entry: JournalEntry = { id, text, prompt, at: Date.now() };
  return { ...vault, journal: [...(vault.journal ?? []), entry] };
}

export function removeJournalEntry(vault: Vault, id: string): Vault {
  return { ...vault, journal: (vault.journal ?? []).filter((e) => e.id !== id) };
}
