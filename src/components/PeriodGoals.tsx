// 목표 탭의 "기간 목표" — 연간·월간·주간 목표를 세우고, 목표마다 해본 시도(뭘 했고·결과·배운 점)를 쌓고,
// 그 기간을 마치며 돌아본다. 동기화를 켜두면 폰이 바뀌어도 그대로 이어진다.
import { useState } from "react";
import { useSession } from "../session";
import {
  addAttempt,
  addPeriodGoal,
  carryOver,
  deleteAttempt,
  deletePeriodGoal,
  editPeriodGoal,
  findReflection,
  goalsFor,
  periodProgress,
  saveReflection,
  setGoalStatus,
  type AttemptInput,
} from "../lib/period-goals";
import { PERIOD_LABEL, periodKey, periodRange, periodRelative, periodTitle, shiftPeriod } from "../lib/period";
import { todayDateStr } from "../lib/derive";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { headingStyle, primaryBtnStyle, sectionStyle } from "../lib/layout";
import type { GoalAttempt, GoalPeriod, PeriodGoal } from "../types";

const PERIODS: GoalPeriod[] = ["week", "month", "year"];
const OUTCOME: Record<NonNullable<GoalAttempt["outcome"]>, { icon: string; label: string }> = {
  good: { icon: "😊", label: "잘됐어요" },
  meh: { icon: "😐", label: "그저 그래요" },
  bad: { icon: "😣", label: "아쉬워요" },
};

/** 입력 필터에 걸리는 칸이 있으면 그 사유. */
function blocked(...texts: (string | undefined)[]): string | null {
  for (const t of texts) {
    const r = t ? checkSensitive(t) : null;
    if (r) return BLOCK_REASON_LABEL[r];
  }
  return null;
}

export function PeriodGoals() {
  const { vault, update } = useSession();
  const today = todayDateStr();
  const [period, setPeriod] = useState<GoalPeriod>("week");
  const [keys, setKeys] = useState<Record<GoalPeriod, string>>(() => ({
    week: periodKey("week", today),
    month: periodKey("month", today),
    year: periodKey("year", today),
  }));
  const key = keys[period];
  const setKey = (k: string) => setKeys((prev) => ({ ...prev, [period]: k }));
  const [draft, setDraft] = useState("");
  const [why, setWhy] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vault) return null;
  const goals = goalsFor(vault, period, key);
  const { done, total } = periodProgress(goals);
  const rel = periodRelative(period, key, today);
  const isPast = key < periodKey(period, today);
  // 위 기간 목표를 같이 보여줘서 "이번 주 목표가 이번 달·올해 목표로 이어지는지" 보이게.
  const parentPeriod: GoalPeriod | null = period === "week" ? "month" : period === "month" ? "year" : null;
  const parentKey = parentPeriod ? periodKey(parentPeriod, period === "week" ? periodRange("week", key).start : `${key}-01`) : null;
  const parentGoals = parentPeriod && parentKey ? goalsFor(vault, parentPeriod, parentKey).filter((g) => g.status === "doing") : [];

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = blocked(text, why);
    if (reason) return setError(reason);
    setError(null);
    update((v) => addPeriodGoal(v, period, key, text, why));
    setDraft("");
    setWhy("");
    setShowWhy(false);
  };

  return (
    <>
      <section style={sectionStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, background: "var(--field)", borderRadius: 12, padding: 4 }} role="group" aria-label="기간">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              style={{ padding: "8px 0", borderRadius: 9, border: "none", fontSize: 13.5, fontWeight: 600, background: period === p ? "var(--card)" : "transparent", color: period === p ? "var(--fg)" : "var(--muted)", boxShadow: period === p ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button type="button" onClick={() => setKey(shiftPeriod(period, key, -1))} aria-label="이전 기간" style={navBtnStyle}>
            ‹
          </button>
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <b style={{ fontSize: 16 }}>{periodTitle(period, key)}</b>
            <div style={{ fontSize: 12, color: rel?.startsWith("이번") ? "var(--accent)" : "var(--muted)" }}>
              {rel ?? ""}
              {total > 0 && `${rel ? " · " : ""}${done}/${total} 달성`}
            </div>
          </div>
          <button type="button" onClick={() => setKey(shiftPeriod(period, key, 1))} aria-label="다음 기간" style={navBtnStyle}>
            ›
          </button>
        </div>
        {total > 0 && (
          <div style={{ height: 6, borderRadius: 3, background: "var(--field)", overflow: "hidden" }} aria-hidden>
            <div style={{ width: `${(done / total) * 100}%`, height: "100%", background: "var(--ok)", borderRadius: 3, transition: "width .2s" }} />
          </div>
        )}
        {!rel?.startsWith("이번") && (
          <button type="button" onClick={() => setKey(periodKey(period, today))} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--accent)", fontSize: 12.5 }}>
            이번 {period === "week" ? "주" : period === "month" ? "달" : "해"}로 돌아가기
          </button>
        )}

        {parentGoals.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", background: "var(--field)", borderRadius: 10, padding: "8px 10px" }}>
            🧭 {parentPeriod === "month" ? "이번 달" : "올해"} 목표: {parentGoals.map((g) => g.text).join(" · ")}
          </p>
        )}

        {goals.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>
            {isPast ? "이 기간엔 세운 목표가 없어요." : `${PERIOD_LABEL[period]} 목표를 세워보세요. 크게 하나여도 괜찮아요.`}
          </p>
        )}
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} nextKey={shiftPeriod(period, key, 1)} nextLabel={period === "week" ? "다음 주" : period === "month" ? "다음 달" : "내년"} />
        ))}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
              placeholder={period === "week" ? "예: 3번 먼저 안부 연락하기" : period === "month" ? "예: 책 2권 읽기" : "예: 화내지 않고 말하는 사람 되기"}
              aria-label={`새 ${PERIOD_LABEL[period]} 목표`}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button type="button" onClick={add} disabled={!draft.trim()} style={primaryBtnStyle}>
              추가
            </button>
          </div>
          {showWhy ? (
            <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="왜 이 목표를 세웠나요? (선택)" aria-label="목표를 세운 이유" style={inputStyle} />
          ) : (
            <button type="button" onClick={() => setShowWhy(true)} style={{ ...tinyBtnStyle, alignSelf: "flex-start", padding: 0 }}>
              + 이유도 적기
            </button>
          )}
          {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
        </div>
      </section>

      <ReflectionCard key={`${period}:${key}`} period={period} periodKeyStr={key} />
    </>
  );
}

function GoalCard({ goal, nextKey, nextLabel }: { goal: PeriodGoal; nextKey: string; nextLabel: string }) {
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(goal.text);
  const [why, setWhy] = useState(goal.why ?? "");
  const [moved, setMoved] = useState(false);
  const done = goal.status === "done";
  const dropped = goal.status === "dropped";
  const attempts = [...goal.attempts].sort((a, b) => b.at - a.at);

  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: done ? "color-mix(in srgb, var(--ok) 10%, var(--card))" : "var(--card)", opacity: dropped ? 0.6 : 1, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <button
          type="button"
          onClick={() => update((v) => setGoalStatus(v, goal.id, done ? "doing" : "done"))}
          aria-pressed={done}
          aria-label={(done ? "달성 취소: " : "달성: ") + goal.text}
          style={{ width: 26, height: 26, borderRadius: 8, border: done ? "1px solid var(--ok)" : "1.5px solid var(--muted)", background: done ? "var(--ok)" : "var(--card)", color: "#fff", fontSize: 14, flexShrink: 0, padding: 0 }}
        >
          {done ? "✓" : ""}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, color: "var(--fg)" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, textDecoration: dropped ? "line-through" : "none", wordBreak: "break-word" }}>{goal.text}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>
            {dropped ? "내려놓음 · " : ""}
            시도 {goal.attempts.length}번{done && goal.doneAt ? ` · ${formatDate(goal.doneAt)} 달성` : ""}
          </span>
        </button>
        <span style={{ color: "var(--muted)", fontSize: 12 }} aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 12px 12px" }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} aria-label="목표 문구" style={inputStyle} />
              <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="왜 이 목표를 세웠나요? (선택)" aria-label="목표 이유" style={inputStyle} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditing(false)} style={ghostBtnStyle}>
                  취소
                </button>
                <button
                  type="button"
                  disabled={!text.trim() || !!blocked(text, why)}
                  onClick={() => {
                    update((v) => editPeriodGoal(v, goal.id, text, why));
                    setEditing(false);
                  }}
                  style={primaryBtnStyle}
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            goal.why && <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg2)" }}>🎯 {goal.why}</p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 13, color: "var(--fg2)" }}>해본 것</b>
            {!adding && (
              <button type="button" onClick={() => setAdding(true)} style={{ ...tinyBtnStyle, color: "var(--accent)", fontWeight: 600 }}>
                + 시도 기록
              </button>
            )}
          </div>
          {adding && (
            <AttemptForm
              onSave={(input) => {
                update((v) => addAttempt(v, goal.id, input));
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          )}
          {attempts.length === 0 && !adding && <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>목표를 위해 뭘 해봤는지, 결과가 어땠는지 남겨보세요.</p>}
          {attempts.map((a) => (
            <div key={a.id} style={{ background: "var(--field)", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                {a.outcome && <span title={OUTCOME[a.outcome].label}>{OUTCOME[a.outcome].icon}</span>}
                <span style={{ flex: 1, fontSize: 13.5, wordBreak: "break-word" }}>{a.did}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{formatDate(a.at)}</span>
              </div>
              {a.result && <span style={{ fontSize: 12.5, color: "var(--fg2)" }}>→ {a.result}</span>}
              {a.learned && <span style={{ fontSize: 12.5, color: "var(--accent)" }}>💡 {a.learned}</span>}
              <button
                type="button"
                onClick={() => confirm("이 시도 기록을 지울까요?") && update((v) => deleteAttempt(v, goal.id, a.id))}
                style={{ ...tinyBtnStyle, alignSelf: "flex-end", padding: 0, fontSize: 11 }}
              >
                삭제
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            {!done && (
              <button type="button" onClick={() => update((v) => setGoalStatus(v, goal.id, dropped ? "doing" : "dropped"))} style={tinyBtnStyle}>
                {dropped ? "다시 도전" : "내려놓기"}
              </button>
            )}
            {!done && (
              <button
                type="button"
                disabled={moved}
                onClick={() => {
                  update((v) => carryOver(v, goal.id, nextKey));
                  setMoved(true);
                }}
                style={tinyBtnStyle}
              >
                {moved ? `${nextLabel}에 추가했어요 ✓` : `${nextLabel}로 이어가기`}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setText(goal.text);
                setWhy(goal.why ?? "");
                setEditing(true);
              }}
              style={tinyBtnStyle}
            >
              수정
            </button>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => confirm(`"${goal.text}" 목표와 시도 기록을 지울까요?`) && update((v) => deletePeriodGoal(v, goal.id))}
              style={{ ...tinyBtnStyle, color: "var(--warn)" }}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AttemptForm({ onSave, onCancel }: { onSave: (a: AttemptInput) => void; onCancel: () => void }) {
  const [did, setDid] = useState("");
  const [result, setResult] = useState("");
  const [outcome, setOutcome] = useState<AttemptInput["outcome"]>(undefined);
  const [learned, setLearned] = useState("");
  const err = blocked(did, result, learned);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid var(--accent)", borderRadius: 12, padding: 10 }}>
      <input value={did} onChange={(e) => setDid(e.target.value)} placeholder="뭘 해봤나요? 예: 퇴근길에 30분 걷기" aria-label="해본 것" style={inputStyle} autoFocus />
      <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="결과는요? 예: 20분 걷고 비 와서 멈춤" aria-label="결과" style={inputStyle} />
      <div style={{ display: "flex", gap: 6 }} role="group" aria-label="어땠나요">
        {(Object.keys(OUTCOME) as (keyof typeof OUTCOME)[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={outcome === k}
            onClick={() => setOutcome(outcome === k ? undefined : k)}
            style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "1px solid var(--line)", background: outcome === k ? "var(--accent)" : "var(--field)", color: outcome === k ? "var(--accent-fg)" : "var(--fg2)", fontSize: 12.5 }}
          >
            {OUTCOME[k].icon} {OUTCOME[k].label}
          </button>
        ))}
      </div>
      <input value={learned} onChange={(e) => setLearned(e.target.value)} placeholder="배운 점·다음엔 이렇게 (선택)" aria-label="배운 점" style={inputStyle} />
      {err && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={ghostBtnStyle}>
          취소
        </button>
        <button type="button" disabled={!did.trim() || !!err} onClick={() => onSave({ did, result, outcome, learned })} style={primaryBtnStyle}>
          기록
        </button>
      </div>
    </div>
  );
}

function ReflectionCard({ period, periodKeyStr }: { period: GoalPeriod; periodKeyStr: string }) {
  const { vault, update } = useSession();
  const saved = vault ? findReflection(vault, period, periodKeyStr) : undefined;
  const [good, setGood] = useState(saved?.good ?? "");
  const [bad, setBad] = useState(saved?.bad ?? "");
  const [next, setNext] = useState(saved?.next ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = good !== (saved?.good ?? "") || bad !== (saved?.bad ?? "") || next !== (saved?.next ?? "");
  const unit = period === "week" ? "이번 주" : period === "month" ? "이번 달" : "올해";

  const save = () => {
    const err = blocked(good, bad, next);
    if (err) return setMsg(err);
    update((v) => saveReflection(v, period, periodKeyStr, { good, bad, next }));
    setMsg("저장했어요.");
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={headingStyle}>🪞 돌아보기</h2>
        {saved && !dirty && <span style={{ fontSize: 12, color: "var(--ok)" }}>✓ 저장됨</span>}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>{periodTitle(period, periodKeyStr)}을 마치며 솔직하게 적어보세요. 나만 봐요.</p>
      <label style={fieldStyle}>
        <span>👍 잘한 점</span>
        <textarea rows={2} value={good} onChange={(e) => setGood(e.target.value)} placeholder={`${unit} 스스로 칭찬하고 싶은 것`} style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <label style={fieldStyle}>
        <span>🤔 아쉬운 점·반성</span>
        <textarea rows={2} value={bad} onChange={(e) => setBad(e.target.value)} placeholder="잘 안 된 것, 왜 그랬는지" style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <label style={fieldStyle}>
        <span>➡️ 다음엔</span>
        <textarea rows={2} value={next} onChange={(e) => setNext(e.target.value)} placeholder="다음 기간에 바꿔볼 한 가지" style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={save} disabled={!dirty} style={primaryBtnStyle}>
          돌아보기 저장
        </button>
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("저장") ? "var(--ok)" : "var(--warn)" }}>{msg}</span>}
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--fg2)" };
const tinyBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: 2 };
const ghostBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "var(--field)", color: "var(--fg2)" };
const navBtnStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, border: "1px solid var(--line)", background: "var(--card)", fontSize: 18, color: "var(--fg2)", flexShrink: 0 };
