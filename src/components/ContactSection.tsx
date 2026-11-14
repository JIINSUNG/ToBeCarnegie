// 사람 카드의 "다음에 물어볼 것" 체크리스트와 "연락 기록" 타임라인.
import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import {
  addContactLog,
  addFollowUp,
  CONTACT_KIND_ICON,
  CONTACT_KIND_LABEL,
  CONTACT_KINDS,
  contactCountWithin,
  contactTimeline,
  deleteContactLog,
  deleteFollowUp,
  openFollowUps,
  toggleFollowUp,
} from "../lib/contacts";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate, timeAgo } from "../lib/format";
import { todayDateStr } from "../lib/derive";
import type { Person } from "../types";

const PREVIEW = 5;

export function FollowUpSection({ person }: { person: Person }) {
  const { update } = useSession();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const open = openFollowUps(person);
  const done = (person.followUps ?? []).filter((f) => f.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    update((v) => addFollowUp(v, person.id, text));
    setDraft("");
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={headingStyle}>🙋 다음에 물어볼 것</h2>
        {open.length > 0 && <span style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 600 }}>{open.length}개</span>}
      </div>
      {open.length === 0 && <p style={hintStyle}>지난번에 들은 일(이사·시험·건강 등)의 근황을 적어두면, 다음에 연락할 때 잊지 않고 챙길 수 있어요.</p>}
      {open.map((f) => (
        <div key={f.id} style={rowStyle}>
          <button type="button" onClick={() => update((v) => toggleFollowUp(v, person.id, f.id))} aria-label={`물어봤어요: ${f.text}`} style={checkStyle(false)} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{f.text}</span>
          <button type="button" onClick={() => update((v) => deleteFollowUp(v, person.id, f.id))} aria-label={`${f.text} 삭제`} style={tinyBtnStyle}>
            삭제
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
          placeholder="예: 이직한 회사 적응 잘 했는지"
          aria-label="다음에 물어볼 것"
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={add} disabled={!draft.trim()} style={addBtnStyle}>
          추가
        </button>
      </div>
      {error && <p style={{ ...hintStyle, color: "var(--warn)" }}>{error}</p>}
      {done.length > 0 && (
        <>
          <button type="button" onClick={() => setShowDone((s) => !s)} style={{ ...tinyBtnStyle, alignSelf: "flex-start", padding: 0 }}>
            {showDone ? "물어본 것 숨기기" : `물어본 것 ${done.length}개 보기`}
          </button>
          {showDone &&
            done.map((f) => (
              <div key={f.id} style={{ ...rowStyle, opacity: 0.7 }}>
                <button type="button" onClick={() => update((v) => toggleFollowUp(v, person.id, f.id))} aria-label={`다시 물어볼 것으로: ${f.text}`} style={checkStyle(true)}>
                  ✓
                </button>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, textDecoration: "line-through", color: "var(--muted)" }}>{f.text}</span>
                {f.doneAt && <span style={{ fontSize: 11.5, color: "var(--muted)", flexShrink: 0 }}>{formatDate(f.doneAt)}</span>}
              </div>
            ))}
        </>
      )}
    </section>
  );
}

/** "YYYY-MM-DD"를 그날의 지금 시각으로 — 오늘이면 지금, 지난 날이면 그날 정오(시간대 경계에서 날짜가 안 밀리게). */
function dateToTs(date: string): number {
  if (date === todayDateStr()) return Date.now();
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export function ContactSection({ person }: { person: Person }) {
  const { update } = useSession();
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(() => todayDateStr());
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const timeline = contactTimeline(person);
  const shown = showAll ? timeline : timeline.slice(0, PREVIEW);
  const recent30 = contactCountWithin(person, 30);

  const log = (kind: (typeof CONTACT_KINDS)[number]["kind"]) => {
    const reason = checkSensitive(memo);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    const id = nanoid();
    update((v) => addContactLog(v, person.id, kind, memo, dateToTs(date), id));
    setJustAdded(id);
    setMemo("");
    setDate(todayDateStr());
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={headingStyle}>📒 연락 기록</h2>
        {timeline.length > 0 && <span style={hintStyle}>최근 30일 {recent30}번</span>}
      </div>
      <input
        value={memo}
        onChange={(e) => {
          setMemo(e.target.value);
          setError(null);
        }}
        placeholder="무슨 얘기 했는지 (선택)"
        aria-label="연락 메모"
        style={inputStyle}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--fg2)" }}>
        <input type="date" value={date} max={todayDateStr()} onChange={(e) => setDate(e.target.value || todayDateStr())} aria-label="연락한 날" style={{ ...inputStyle, padding: "6px 10px", flex: 1, minWidth: 0 }} />
        <span style={{ whiteSpace: "nowrap" }}>에 연락했어요</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {CONTACT_KINDS.map((k) => (
          <button key={k.kind} type="button" onClick={() => log(k.kind)} style={kindBtnStyle}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{k.icon}</span>
            <span>{k.label}</span>
          </button>
        ))}
      </div>
      {error && <p style={{ ...hintStyle, color: "var(--warn)" }}>{error}</p>}
      {justAdded && timeline.some((l) => l.id === justAdded) && (
        <p style={{ ...hintStyle, color: "var(--ok)", display: "flex", gap: 10, alignItems: "center" }}>
          ✓ 기록했어요
          <button
            type="button"
            onClick={() => {
              update((v) => deleteContactLog(v, person.id, justAdded));
              setJustAdded(null);
            }}
            style={{ ...tinyBtnStyle, padding: 0, textDecoration: "underline" }}
          >
            되돌리기
          </button>
        </p>
      )}

      {timeline.length === 0 ? (
        <p style={hintStyle}>
          {person.lastContactAt ? `마지막 연락 ${formatDate(person.lastContactAt)} — 이제부터는 언제·어떻게 연락했는지 쌓여요.` : "아직 연락 기록이 없어요."}
        </p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map((l) => (
            <li key={l.id} style={{ ...rowStyle, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, lineHeight: "20px" }} aria-hidden>
                {CONTACT_KIND_ICON[l.kind]}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12.5, color: "var(--fg2)" }}>
                  {CONTACT_KIND_LABEL[l.kind]} · {formatDate(l.at)} <span style={{ color: "var(--muted)" }}>({timeAgo(l.at)})</span>
                </span>
                {l.memo && <span style={{ fontSize: 14, wordBreak: "break-word" }}>{l.memo}</span>}
              </div>
              <button
                type="button"
                onClick={() => confirm("이 연락 기록을 지울까요?") && update((v) => deleteContactLog(v, person.id, l.id))}
                aria-label="연락 기록 삭제"
                style={tinyBtnStyle}
              >
                삭제
              </button>
            </li>
          ))}
        </ol>
      )}
      {timeline.length > PREVIEW && (
        <button type="button" onClick={() => setShowAll((s) => !s)} style={{ ...tinyBtnStyle, alignSelf: "center" }}>
          {showAll ? "접기" : `${timeline.length - PREVIEW}개 더 보기`}
        </button>
      )}
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
};
const headingStyle: React.CSSProperties = { fontSize: 14, margin: 0, color: "var(--fg2)" };
const hintStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 12.5, margin: 0 };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg)", fontSize: 16 };
const rowStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: "var(--radius)", background: "var(--field)", display: "flex", alignItems: "center", gap: 10 };
const tinyBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: 12, padding: 4, flexShrink: 0, whiteSpace: "nowrap" };
const addBtnStyle: React.CSSProperties = {
  padding: "0 14px",
  borderRadius: 999,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 13.5,
  fontWeight: 600,
  flexShrink: 0,
};
const kindBtnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "10px 4px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "var(--field)",
  color: "var(--fg)",
  fontSize: 12.5,
  fontWeight: 600,
};
function checkStyle(done: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 8,
    border: done ? "1px solid var(--ok)" : "1.5px solid var(--muted)",
    background: done ? "var(--ok)" : "var(--card)",
    color: "#fff",
    fontSize: 14,
    padding: 0,
    flexShrink: 0,
  };
}
