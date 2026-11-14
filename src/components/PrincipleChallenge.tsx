// 성장 탭 "이번 주 카네기 원칙" — 주마다 원칙 하나를 골라, 실천한 순간(누구에게·어떻게)을 남긴다.
import { useState } from "react";
import { useSession } from "../session";
import {
  addPractice,
  choosePrinciple,
  deletePractice,
  practiceCounts,
  practicesFor,
  PRINCIPLE_PARTS,
  PRINCIPLES,
  principleFor,
  suggestPrinciple,
  type Principle,
} from "../lib/principles";
import { periodKey, periodTitle } from "../lib/period";
import { todayDateStr } from "../lib/derive";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { headingStyle, primaryBtnStyle, sectionStyle } from "../lib/layout";

export function PrincipleChallenge() {
  const { vault, update } = useSession();
  const weekKey = periodKey("week", todayDateStr());
  const [picking, setPicking] = useState(false);
  const [text, setText] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!vault) return null;

  const chosen = principleFor(vault, weekKey);
  const suggestion = suggestPrinciple(vault, weekKey);
  const counts = practiceCounts(vault);
  const thisWeek = practicesFor(vault, { weekKey });
  const triedCount = PRINCIPLES.filter((p) => counts[p.id]).length;
  const people = [...vault.people].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const nameOf = (id?: string) => (id ? vault.people.find((p) => p.id === id)?.name : undefined);

  const choose = (p: Principle) => {
    update((v) => choosePrinciple(v, weekKey, p.id));
    setPicking(false);
  };

  const add = () => {
    if (!chosen || !text.trim()) return;
    const r = checkSensitive(text);
    if (r) return setError(BLOCK_REASON_LABEL[r]);
    setError(null);
    update((v) => addPractice(v, weekKey, chosen.id, text, personId || undefined));
    setText("");
    setPersonId("");
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={headingStyle}>🤝 이번 주 카네기 원칙</h2>
        <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
          {triedCount} / {PRINCIPLES.length}개 해봄
        </span>
      </div>

      {picking ? (
        <PrinciplePicker counts={counts} current={chosen?.id} onPick={choose} onClose={() => setPicking(false)} />
      ) : chosen ? (
        <>
          <PrincipleCard p={chosen} label={`${periodTitle("week", weekKey)} · 실천 ${thisWeek.length}번`} />
          <div className="input-row">
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
              placeholder="어떻게 실천했나요? 예: 회의에서 후배 이름 불러주며 의견 물어봄"
              aria-label="원칙 실천 기록"
              style={inputStyle}
            />
            {people.length > 0 && (
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="누구에게" style={inputStyle}>
                <option value="">누구에게? (선택)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={add} disabled={!text.trim()} style={primaryBtnStyle}>
              실천했어요
            </button>
          </div>
          {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
          {thisWeek.map((x) => (
            <div key={x.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--field)", borderRadius: 10, padding: "8px 10px" }}>
              <span aria-hidden>✅</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                {x.text}
                <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>
                  {formatDate(x.at)}
                  {nameOf(x.personId) && ` · ${nameOf(x.personId)}`}
                </span>
              </span>
              <button type="button" onClick={() => confirm("이 실천 기록을 지울까요?") && update((v) => deletePractice(v, x.id))} style={tinyBtnStyle}>
                삭제
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setPicking(true)} style={{ ...tinyBtnStyle, alignSelf: "flex-start" }}>
            다른 원칙으로 바꾸기
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>일주일에 원칙 하나만 의식하며 지내보세요. 이번 주엔 이걸 추천해요.</p>
          <PrincipleCard p={suggestion} label="이번 주 추천" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => choose(suggestion)} style={primaryBtnStyle}>
              이걸로 할게요
            </button>
            <button type="button" onClick={() => setPicking(true)} style={{ ...primaryBtnStyle, background: "var(--field)", color: "var(--fg2)" }}>
              직접 고르기
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function PrincipleCard({ p, label }: { p: Principle; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 16, background: "var(--accent)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>
        {label} · {PRINCIPLE_PARTS[p.part]}
      </span>
      <p style={{ margin: 0, fontSize: 16.5, fontWeight: 700, lineHeight: 1.45, color: "var(--accent-fg)" }}>{p.text}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--accent-fg)", opacity: 0.9 }}>💡 {p.tip}</p>
    </div>
  );
}

function PrinciplePicker({ counts, current, onPick, onClose }: { counts: Record<string, number>; current?: string; onPick: (p: Principle) => void; onClose: () => void }) {
  const parts = Object.keys(PRINCIPLE_PARTS) as Principle["part"][];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--fg2)" }}>이번 주에 연습할 원칙을 골라요</span>
        <button type="button" onClick={onClose} style={tinyBtnStyle}>
          닫기
        </button>
      </div>
      {parts.map((part) => (
        <div key={part} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: 12.5, color: "var(--muted)" }}>{PRINCIPLE_PARTS[part]}</b>
          {PRINCIPLES.filter((p) => p.part === part).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              aria-pressed={p.id === current}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 12,
                border: p.id === current ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                background: "var(--field)",
                color: "var(--fg)",
                fontSize: 13.5,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>{p.text}</span>
              {counts[p.id] ? <span style={{ fontSize: 11.5, color: "var(--ok)", whiteSpace: "nowrap" }}>✓ {counts[p.id]}번</span> : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const tinyBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: 2, flexShrink: 0 };

