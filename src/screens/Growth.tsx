import { useState } from "react";
import { useSession } from "../session";
import { addMission, isMissionDone, missionStreak, removeMission, toggleMissionDone } from "../lib/missions";
import { addAffirmation, affirmationStreak, isAffirmationDone, removeAffirmation, toggleAffirmationDone } from "../lib/affirmations";
import { addJournalEntry, JOURNAL_PROMPTS, pickJournalPrompt, removeJournalEntry } from "../lib/journal";
import { todayDateStr } from "../lib/derive";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { headingStyle, linkStyle, primaryBtnStyle, sectionStyle, stickyHeaderStyle } from "../lib/layout";
import type { JournalEntry, Mission } from "../types";

export function Growth({ onBack }: { onBack: () => void }) {
  const { vault, update } = useSession();
  const date = todayDateStr();
  const missions = vault?.missions ?? [];
  const journal = vault?.journal ?? [];

  const [missionDraft, setMissionDraft] = useState("");
  const [missionError, setMissionError] = useState<string | null>(null);

  const addDraftMission = () => {
    const text = missionDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setMissionError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setMissionError(null);
    update((v) => addMission(v, text));
    setMissionDraft("");
  };

  const doneCount = vault ? missions.filter((m) => isMissionDone(vault, m.id, date)).length : 0;

  const affirmations = vault?.affirmations ?? [];
  const [affirmationDraft, setAffirmationDraft] = useState("");
  const [affirmationError, setAffirmationError] = useState<string | null>(null);

  const addDraftAffirmation = () => {
    const text = affirmationDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setAffirmationError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setAffirmationError(null);
    update((v) => addAffirmation(v, text));
    setAffirmationDraft("");
  };

  const affirmationDoneCount = vault ? affirmations.filter((a) => isAffirmationDone(vault, a.id, date)).length : 0;
  // 아직 안 외친 것부터 하나씩 보여주고, 다 외쳤으면 첫 번째를 다시 보여준다(복습 느낌).
  const nextAffirmation = (vault && affirmations.find((a) => !isAffirmationDone(vault, a.id, date))) || affirmations[0];

  const [prompt, setPrompt] = useState(() => pickJournalPrompt());
  const [journalDraft, setJournalDraft] = useState("");
  const [journalError, setJournalError] = useState<string | null>(null);

  const addDraftJournal = () => {
    const text = journalDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setJournalError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setJournalError(null);
    update((v) => addJournalEntry(v, text, prompt));
    setJournalDraft("");
    setPrompt(pickJournalPrompt());
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>성장</h1>
        <span style={{ width: 40 }} />
      </div>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={headingStyle}>🎯 오늘의 미션</h2>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
            {doneCount} / {missions.length}
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>한 번 등록하면 매일 다시 나타나요. 꾸준히 체크해서 습관을 만들어보세요.</p>

        {missions.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 등록한 미션이 없어요.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missions.map((m) => (
              <RecurringItemRow
                key={m.id}
                item={m}
                done={vault ? isMissionDone(vault, m.id, date) : false}
                streak={vault ? missionStreak(vault, m.id, date) : 0}
                onToggle={() => update((v) => toggleMissionDone(v, m.id, date))}
                onRemove={() => update((v) => removeMission(v, m.id))}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={missionDraft}
            onChange={(e) => {
              setMissionDraft(e.target.value);
              setMissionError(null);
            }}
            placeholder="예: 하루에 한 사람에게 먼저 연락하기"
            onKeyDown={(e) => e.key === "Enter" && addDraftMission()}
            style={inputStyle}
          />
          <button type="button" onClick={addDraftMission} disabled={!missionDraft.trim()} style={primaryBtnStyle}>
            추가
          </button>
        </div>
        {missionError && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{missionError}</p>}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={headingStyle}>📣 오늘의 구호</h2>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
            {affirmationDoneCount} / {affirmations.length}
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>매일 아침 소리 내어 외쳐보세요. 예: "나는 나를 좋아한다."</p>

        {nextAffirmation && (
          <div style={promptBoxStyle}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>오늘의 구호</span>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--accent-fg)" }}>{nextAffirmation.text}</p>
            {vault && !isAffirmationDone(vault, nextAffirmation.id, date) && (
              <button
                type="button"
                onClick={() => update((v) => toggleAffirmationDone(v, nextAffirmation.id, date))}
                style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--accent-fg)", fontSize: 13, fontWeight: 600, padding: 0 }}
              >
                외쳤어요! →
              </button>
            )}
          </div>
        )}

        {affirmations.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 등록한 구호가 없어요.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {affirmations.map((a) => (
              <RecurringItemRow
                key={a.id}
                item={a}
                done={vault ? isAffirmationDone(vault, a.id, date) : false}
                streak={vault ? affirmationStreak(vault, a.id, date) : 0}
                onToggle={() => update((v) => toggleAffirmationDone(v, a.id, date))}
                onRemove={() => update((v) => removeAffirmation(v, a.id))}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={affirmationDraft}
            onChange={(e) => {
              setAffirmationDraft(e.target.value);
              setAffirmationError(null);
            }}
            placeholder="예: 나는 나를 좋아한다"
            onKeyDown={(e) => e.key === "Enter" && addDraftAffirmation()}
            style={inputStyle}
          />
          <button type="button" onClick={addDraftAffirmation} disabled={!affirmationDraft.trim()} style={primaryBtnStyle}>
            추가
          </button>
        </div>
        {affirmationError && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{affirmationError}</p>}
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>📔 성장 일기</h2>
        <div style={promptBoxStyle}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>오늘의 질문</span>
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--accent-fg)" }}>{prompt}</p>
          {JOURNAL_PROMPTS.length > 1 && (
            <button
              type="button"
              onClick={() => setPrompt(pickJournalPrompt(prompt))}
              style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--accent-fg)", opacity: 0.85, fontSize: 12.5, padding: 0 }}
            >
              다른 질문 →
            </button>
          )}
        </div>
        <textarea
          value={journalDraft}
          onChange={(e) => {
            setJournalDraft(e.target.value);
            setJournalError(null);
          }}
          placeholder="답을 적어보세요 (질문과 상관없이 자유롭게 써도 돼요)"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        {journalError && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{journalError}</p>}
        <button type="button" onClick={addDraftJournal} disabled={!journalDraft.trim()} style={primaryBtnStyle}>
          일기 추가
        </button>

        {journal.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...journal]
              .sort((a, b) => b.at - a.at)
              .map((e) => (
                <JournalRow key={e.id} entry={e} onRemove={() => update((v) => removeJournalEntry(v, e.id))} />
              ))}
          </div>
        )}
      </section>
    </main>
  );
}

/** 오늘의 미션·오늘의 구호가 똑같은 모양(체크 + 연속일수 + 삭제)이라 공용으로 쓴다. */
function RecurringItemRow({ item, done, streak, onToggle, onRemove }: { item: Mission; done: boolean; streak: number; onToggle: () => void; onRemove: () => void }) {
  return (
    <div style={rowStyle}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={(done ? "완료 취소: " : "완료 표시: ") + item.text}
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          border: "1px solid var(--line)",
          background: done ? "var(--ok)" : "var(--card)",
          color: "#fff",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {done ? "✓" : ""}
      </button>
      <span style={{ flex: 1, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "var(--muted)" : "var(--fg)" }}>{item.text}</span>
      {streak >= 2 && (
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>🔥 {streak}일째</span>
      )}
      <button type="button" onClick={onRemove} aria-label={`${item.text} 삭제`} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5, flexShrink: 0 }}>
        삭제
      </button>
    </div>
  );
}

function JournalRow({ entry, onRemove }: { entry: JournalEntry; onRemove: () => void }) {
  return (
    <div style={cardStyle}>
      {entry.prompt && <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{entry.prompt}</span>}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{entry.text}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(entry.at)}</span>
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 11.5, padding: 0 }}>
          삭제
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius)", background: "var(--field)" };
const promptBoxStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 16, background: "var(--accent)" };
const cardStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)" };
