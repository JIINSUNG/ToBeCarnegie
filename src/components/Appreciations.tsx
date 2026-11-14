// 감사·칭찬 기록 — 홈에서 빠르게 남기고(QuickAppreciation), 사람 카드에서 그 사람 것만 본다(PersonAppreciations).
import { useState } from "react";
import { useSession } from "../session";
import { addAppreciation, APPRECIATION_KIND, appreciationsFor, appreciationsToday, deleteAppreciation, toggleExpressed, type AppreciationInput } from "../lib/appreciations";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { headingStyle, primaryBtnStyle, sectionStyle } from "../lib/layout";
import type { Appreciation } from "../types";

function Form({ personId, onDone }: { personId?: string; onDone?: () => void }) {
  const { vault, update } = useSession();
  const [kind, setKind] = useState<Appreciation["kind"]>("thanks");
  const [text, setText] = useState("");
  const [pid, setPid] = useState(personId ?? "");
  const [who, setWho] = useState("");
  const [expressed, setExpressed] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const people = [...(vault?.people ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const save = () => {
    if (!text.trim()) return;
    for (const t of [text, who]) {
      const r = checkSensitive(t);
      if (r) return setMsg({ ok: false, text: BLOCK_REASON_LABEL[r] });
    }
    const input: AppreciationInput = { kind, text, personId: pid || undefined, who, expressed };
    update((v) => addAppreciation(v, input));
    setText("");
    setWho("");
    setExpressed(false);
    if (!personId) setPid("");
    setMsg({ ok: true, text: kind === "thanks" ? "고마운 마음을 남겼어요 💛" : "칭찬을 남겼어요 👏" });
    onDone?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }} role="group" aria-label="종류">
        {(Object.keys(APPRECIATION_KIND) as Appreciation["kind"][]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            style={{ padding: "8px 6px", borderRadius: 999, border: "1px solid var(--line)", fontSize: 13, fontWeight: 600, background: kind === k ? "var(--accent)" : "var(--field)", color: kind === k ? "var(--accent-fg)" : "var(--fg2)" }}
          >
            {APPRECIATION_KIND[k].icon} {APPRECIATION_KIND[k].label}
          </button>
        ))}
      </div>
      <div className="input-row">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMsg(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && save()}
          placeholder={kind === "thanks" ? "예: 바쁜데 서류 대신 챙겨줌" : "예: 발표 자료가 깔끔하다고 말해줌"}
          aria-label={kind === "thanks" ? "고마웠던 일" : "칭찬한 일"}
          style={inputStyle}
        />
        {!personId && (
          <div style={{ display: "flex", gap: 6 }}>
            <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="누구" style={{ ...inputStyle, flex: 1 }}>
              <option value="">{people.length ? "누구? (목록에서)" : "누구?"}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!pid && <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="또는 직접" aria-label="누구(직접 입력)" style={{ ...inputStyle, flex: 1 }} />}
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg2)" }}>
          <input type="checkbox" checked={expressed} onChange={(e) => setExpressed(e.target.checked)} style={{ width: 18, height: 18 }} />
          {kind === "thanks" ? "고맙다고 직접 말했어요" : "직접 칭찬해줬어요"}
        </label>
        <button type="button" onClick={save} disabled={!text.trim()} style={primaryBtnStyle}>
          남기기
        </button>
      </div>
      {msg && <p style={{ margin: 0, fontSize: 12.5, color: msg.ok ? "var(--ok)" : "var(--warn)" }}>{msg.text}</p>}
    </div>
  );
}

/** 홈 화면 카드 — 오늘 몇 개 남겼는지 + 빠른 입력. 처음엔 접혀 있다. */
export function QuickAppreciation() {
  const { vault } = useSession();
  const [open, setOpen] = useState(false);
  if (!vault) return null;
  const today = appreciationsToday(vault);
  return (
    <section style={sectionStyle}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, color: "var(--fg)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg2)" }}>💛 오늘의 감사·칭찬</span>
        <span style={{ fontSize: 12.5, color: today ? "var(--ok)" : "var(--muted)" }}>{today ? `오늘 ${today}개 ✓` : open ? "접기" : "남기기 ›"}</span>
      </button>
      {open && <Form />}
    </section>
  );
}

/** 사람 카드 — 그 사람에게 고마웠던 일·칭찬한 일. */
export function PersonAppreciations({ personId }: { personId: string }) {
  const { vault, update } = useSession();
  const [adding, setAdding] = useState(false);
  if (!vault) return null;
  const list = appreciationsFor(vault, { personId });
  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ ...headingStyle, fontSize: 14, color: "var(--fg2)" }}>💛 감사·칭찬</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 600 }}>
            + 남기기
          </button>
        )}
      </div>
      {adding && <Form personId={personId} onDone={() => setAdding(false)} />}
      {list.length === 0 && !adding && <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>이 사람에게 고마웠던 일, 칭찬해준 일을 남겨두세요.</p>}
      {list.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--field)", borderRadius: 10, padding: "8px 10px" }}>
          <span aria-hidden>{APPRECIATION_KIND[a.kind].icon}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
            {a.text}
            <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>{formatDate(a.at)}</span>
          </span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => update((v) => toggleExpressed(v, a.id))}
              aria-pressed={!!a.expressed}
              style={{ background: "none", border: "none", padding: 2, fontSize: 11.5, color: a.expressed ? "var(--ok)" : "var(--accent)", fontWeight: 600 }}
            >
              {a.expressed ? "✓ 표현함" : "아직 말 안 함"}
            </button>
            <button type="button" onClick={() => confirm("이 기록을 지울까요?") && update((v) => deleteAppreciation(v, a.id))} style={{ background: "none", border: "none", padding: 2, fontSize: 11.5, color: "var(--muted)" }}>
              삭제
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
