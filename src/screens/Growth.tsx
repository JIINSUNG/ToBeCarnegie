import { useState } from "react";
import { useSession } from "../session";
import { addMission, formatMissionProgress, isMissionDone, MAX_MISSION_TARGET, missionCount, missionStreak, removeMission, stepMissionCount, toggleMissionDone, updateMission } from "../lib/missions";
import { addAffirmation, affirmationStreak, isAffirmationDone, removeAffirmation, toggleAffirmationDone } from "../lib/affirmations";
import { addJournalEntry, JOURNAL_PROMPTS, pickJournalPrompt, removeJournalEntry } from "../lib/journal";
import { todayDateStr } from "../lib/derive";
import { MissionCalendar } from "../components/MissionCalendar";
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
  const [targetDraft, setTargetDraft] = useState("");
  const [unitDraft, setUnitDraft] = useState("");
  const [missionError, setMissionError] = useState<string | null>(null);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);

  const addDraftMission = () => {
    const text = missionDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text) ?? checkSensitive(unitDraft);
    if (reason) {
      setMissionError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setMissionError(null);
    const target = targetDraft ? Number(targetDraft) : undefined;
    update((v) => addMission(v, text, undefined, { target, unit: unitDraft }));
    setMissionDraft("");
    setTargetDraft("");
    setUnitDraft("");
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
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>
          한 번 등록하면 매일 다시 나타나요. "고객 5명에게 연락", "물 5잔"처럼 횟수를 정하면 + / − 로 세고, 횟수 없이 두면 체크만 하면 돼요.
        </p>

        {missions.length > 0 && (
          <div style={{ height: 6, borderRadius: 3, background: "var(--field)", overflow: "hidden" }} aria-hidden>
            <div style={{ width: `${(doneCount / missions.length) * 100}%`, height: "100%", background: "var(--ok)", borderRadius: 3, transition: "width 0.2s" }} />
          </div>
        )}

        {missions.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 등록한 미션이 없어요.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missions.map((m) =>
              editingMissionId === m.id ? (
                <MissionEditor
                  key={m.id}
                  mission={m}
                  onSave={(text, target, unit) => {
                    const reason = checkSensitive(text) ?? checkSensitive(unit);
                    if (reason) return BLOCK_REASON_LABEL[reason];
                    update((v) => updateMission(v, m.id, text, { target, unit }));
                    setEditingMissionId(null);
                    return null;
                  }}
                  onCancel={() => setEditingMissionId(null)}
                  onRemove={() => {
                    if (!confirm(`"${m.text}" 미션을 지울까요?`)) return;
                    update((v) => removeMission(v, m.id));
                    setEditingMissionId(null);
                  }}
                />
              ) : (
                <MissionRow
                  key={m.id}
                  mission={m}
                  done={vault ? isMissionDone(vault, m.id, date) : false}
                  count={vault ? missionCount(vault, m.id, date) : 0}
                  streak={vault ? missionStreak(vault, m.id, date) : 0}
                  onToggle={() => update((v) => toggleMissionDone(v, m.id, date))}
                  onStep={(delta) => update((v) => stepMissionCount(v, m.id, date, delta))}
                  onEdit={() => setEditingMissionId(m.id)}
                />
              )
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          <input
            value={missionDraft}
            onChange={(e) => {
              setMissionDraft(e.target.value);
              setMissionError(null);
            }}
            placeholder="예: 고객에게 연락하기, 물 마시기"
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addDraftMission()}
            style={inputStyle}
            aria-label="새 미션"
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TargetFields target={targetDraft} unit={unitDraft} onTarget={setTargetDraft} onUnit={setUnitDraft} />
            <button type="button" onClick={addDraftMission} disabled={!missionDraft.trim()} style={{ ...primaryBtnStyle, alignSelf: "center" }}>
              추가
            </button>
          </div>
        </div>
        {missionError && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{missionError}</p>}
      </section>

      {vault && <MissionCalendar vault={vault} today={date} />}

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
      <button type="button" onClick={onRemove} aria-label={`${item.text} 삭제`} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5, flexShrink: 0, whiteSpace: "nowrap" }}>
        삭제
      </button>
    </div>
  );
}

/** 하루 목표 횟수 + 단위 입력칸 — 비워두면 체크 미션. 새 미션 추가와 수정 화면이 같이 쓴다. */
function TargetFields({ target, unit, onTarget, onUnit }: { target: string; unit: string; onTarget: (v: string) => void; onUnit: (v: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: 13, color: "var(--fg2)" }}>
      <span style={{ whiteSpace: "nowrap" }}>하루</span>
      <input
        inputMode="numeric"
        value={target}
        onChange={(e) => onTarget(e.target.value.replace(/\D/g, "").slice(0, String(MAX_MISSION_TARGET).length))}
        placeholder="횟수"
        aria-label="하루 목표 횟수 (선택)"
        style={{ ...inputStyle, flex: "0 0 64px", width: 64, textAlign: "center", padding: "10px 6px" }}
      />
      <input
        value={unit}
        onChange={(e) => onUnit(e.target.value.slice(0, 6))}
        placeholder="단위"
        aria-label="단위 (선택, 예: 명, 잔)"
        disabled={!target}
        style={{ ...inputStyle, flex: "0 0 64px", width: 64, textAlign: "center", padding: "10px 6px", opacity: target ? 1 : 0.5 }}
      />
      <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{target ? "" : "(비우면 체크만)"}</span>
    </div>
  );
}

/** 오늘의 미션 한 줄 — 체크박스 + 문구 + (횟수 미션이면) − 진행 + 와 진행 막대. 문구를 누르면 수정. */
function MissionRow({
  mission,
  done,
  count,
  streak,
  onToggle,
  onStep,
  onEdit,
}: {
  mission: Mission;
  done: boolean;
  count: number;
  streak: number;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onEdit: () => void;
}) {
  const target = mission.target;
  return (
    <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 8, padding: "10px 10px", background: done ? "color-mix(in srgb, var(--ok) 12%, var(--field))" : "var(--field)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CheckBox done={done} label={mission.text} onToggle={onToggle} />
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${mission.text} 수정`}
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", fontSize: 14, color: done ? "var(--muted)" : "var(--fg)", textDecoration: done && !target ? "line-through" : "none" }}
        >
          {mission.text}
        </button>
        {streak >= 2 && <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>🔥 {streak}일째</span>}
      </div>
      {target && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 38 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }} aria-hidden>
            <div style={{ width: `${Math.min(100, (count / target) * 100)}%`, height: "100%", background: done ? "var(--ok)" : "var(--accent)", borderRadius: 3, transition: "width 0.15s" }} />
          </div>
          <button type="button" onClick={() => onStep(-1)} disabled={count === 0} aria-label={`${mission.text} 하나 빼기`} style={{ ...stepBtnStyle, opacity: count === 0 ? 0.4 : 1 }}>
            −
          </button>
          <span aria-live="polite" style={{ minWidth: 58, textAlign: "center", fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: done ? "var(--ok)" : "var(--fg)" }}>
            {formatMissionProgress(mission, count)}
          </span>
          <button type="button" onClick={() => onStep(1)} aria-label={`${mission.text} 하나 더하기`} style={{ ...stepBtnStyle, background: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" }}>
            +
          </button>
        </div>
      )}
    </div>
  );
}

function MissionEditor({
  mission,
  onSave,
  onCancel,
  onRemove,
}: {
  mission: Mission;
  /** 저장 실패 사유(입력 필터)를 돌려주면 그걸 보여주고, null이면 성공. */
  onSave: (text: string, target: number | undefined, unit: string) => string | null;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(mission.text);
  const [target, setTarget] = useState(mission.target ? String(mission.target) : "");
  const [unit, setUnit] = useState(mission.unit ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (!text.trim()) return;
    setError(onSave(text.trim(), target ? Number(target) : undefined, unit));
  };
  return (
    <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 8, padding: 10, border: "1px solid var(--accent)" }}>
      <input value={text} onChange={(e) => setText(e.target.value)} aria-label="미션 문구" style={inputStyle} autoFocus />
      <TargetFields target={target} unit={unit} onTarget={setTarget} onUnit={setUnit} />
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, padding: 4 }}>
          삭제
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ ...primaryBtnStyle, background: "var(--card)", color: "var(--fg2)", border: "1px solid var(--line)" }}>
            취소
          </button>
          <button type="button" onClick={save} disabled={!text.trim()} style={primaryBtnStyle}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckBox({ done, label, onToggle }: { done: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={(done ? "완료 취소: " : "완료 표시: ") + label}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: done ? "1px solid var(--ok)" : "1.5px solid var(--muted)",
        background: done ? "var(--ok)" : "var(--card)",
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        flexShrink: 0,
        padding: 0,
      }}
    >
      {done ? "✓" : ""}
    </button>
  );
}

function JournalRow({ entry, onRemove }: { entry: JournalEntry; onRemove: () => void }) {
  return (
    <div style={cardStyle}>
      {entry.prompt && <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{entry.prompt}</span>}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{entry.text}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(entry.at)}</span>
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 11.5, padding: 0, flexShrink: 0, whiteSpace: "nowrap" }}>
          삭제
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const stepBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 19,
  fontWeight: 600,
  lineHeight: 1,
  padding: 0,
  flexShrink: 0,
};
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius)", background: "var(--field)" };
const promptBoxStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 16, background: "var(--accent)" };
const cardStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)" };
