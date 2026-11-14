// 사람 상세(좋아하는 것/싫어하는 것/받은 은혜 등)와 책(글귀)에서 똑같이 쓰는, "한 줄 입력 → 칩으로
// 쌓이는" 리스트 입력 UI. 전엔 PersonCard.tsx 안에만 있었는데, 책 글귀에서도 똑같은 패턴이 필요해져
// 공용 컴포넌트로 뺐다.
import { useState } from "react";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";

export function ChipListField({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  tone = "default",
  hint,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
  tone?: "default" | "warn";
  hint?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    onAdd(text);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: tone === "warn" ? "var(--warn)" : "var(--fg2)", fontWeight: 600 }}>{label}</span>
      {hint && <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>{hint}</p>}
      <div className="input-row">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={inputStyle}
        />
        <button type="button" onClick={submit} disabled={!draft.trim()} style={smallAddBtnStyle}>
          추가
        </button>
      </div>
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((t, i) => (
            <button key={i} type="button" onClick={() => onRemove(i)} aria-label={`${t} 삭제`} style={tone === "warn" ? warnChipStyle : chipStyle}>
              {t} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg)", fontSize: 16 };
const smallAddBtnStyle: React.CSSProperties = { padding: "0 14px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 };
const chipStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--fg2)", background: "var(--field)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px" };
const warnChipStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--warn)", background: "var(--field)", border: "1px solid var(--warn)", borderRadius: 999, padding: "4px 10px" };
