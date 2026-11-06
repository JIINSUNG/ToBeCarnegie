import { useState } from "react";
import { useSession } from "../session";
import { addGift, addNote, deleteGift, deleteNote, deletePerson, findPerson, toggleGiftRepaid, touchLastContact } from "../lib/people";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function PersonCard({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const { vault, update } = useSession();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [giftDraft, setGiftDraft] = useState("");
  const [giftError, setGiftError] = useState<string | null>(null);
  const person = vault ? findPerson(vault, id) : undefined;

  if (!person) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <p style={{ color: "var(--muted)" }}>이 사람은 이미 지워졌어요.</p>
      </main>
    );
  }

  const addDraftNote = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    update((v) => addNote(v, id, text));
    setDraft("");
  };

  const addDraftGift = () => {
    const text = giftDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setGiftError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setGiftError(null);
    update((v) => addGift(v, id, text));
    setGiftDraft("");
  };

  const removePerson = () => {
    if (!confirm(`${person.name} 기록을 전부 지울까요? 되돌릴 수 없어요.`)) return;
    update((v) => deletePerson(v, id));
    onBack();
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <button type="button" onClick={() => onEdit(id)} style={{ ...linkStyle, color: "var(--accent)" }}>
          수정
        </button>
      </div>

      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>{person.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
          {person.birthday && `생일 ${person.birthday}`}
          {person.birthday && person.tags.length > 0 && " · "}
          {person.tags.join(" · ")}
        </p>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0" }}>
          {person.lastContactAt ? `마지막 연락 ${formatDate(person.lastContactAt)}` : "아직 연락 기록 없음"}
        </p>
        <button
          type="button"
          onClick={() => update((v) => touchLastContact(v, id))}
          style={{ marginTop: 8, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--field)", fontSize: 12.5 }}
        >
          오늘 연락했어요
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          rows={2}
          placeholder="새로 들은 걸 적어두세요 (예: 커피는 아이스 아메리카노만 마심)"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          style={{ padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 14.5, resize: "vertical" }}
        />
        {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="button"
          onClick={addDraftNote}
          disabled={!draft.trim()}
          style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 999, border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 }}
        >
          기록 추가
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {person.notes.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>아직 적어둔 게 없어요.</p>}
        {[...person.notes]
          .sort((a, b) => b.at - a.at)
          .map((n) => (
            <div key={n.id} style={{ padding: "10px 12px", borderRadius: "var(--radius)", background: "var(--field)", display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ margin: 0, fontSize: 14 }}>{n.text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(n.at)}</span>
                <button
                  type="button"
                  onClick={() => update((v) => deleteNote(v, id, n.id))}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5 }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <h2 style={{ fontSize: 14, margin: 0, color: "var(--fg2)" }}>받은 선물</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="예: 생일 선물로 향수"
            value={giftDraft}
            onChange={(e) => {
              setGiftDraft(e.target.value);
              setGiftError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addDraftGift()}
            style={{ flex: 1, padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 14 }}
          />
          <button
            type="button"
            onClick={addDraftGift}
            disabled={!giftDraft.trim()}
            style={{ padding: "0 14px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 }}
          >
            추가
          </button>
        </div>
        {giftError && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{giftError}</p>}

        {(person.gifts ?? []).length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 받은 선물이 없어요.</p>}
        {[...(person.gifts ?? [])]
          .sort((a, b) => b.at - a.at)
          .map((g) => (
            <div key={g.id} style={{ padding: "10px 12px", borderRadius: "var(--radius)", background: "var(--field)", display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => update((v) => toggleGiftRepaid(v, id, g.id))}
                aria-pressed={g.repaid}
                aria-label={g.repaid ? "갚음 표시 해제" : "갚음으로 표시"}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: g.repaid ? "var(--ok)" : "var(--card)",
                  color: "#fff",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {g.repaid ? "✓" : ""}
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, textDecoration: g.repaid ? "line-through" : "none", color: g.repaid ? "var(--muted)" : "var(--fg)" }}>{g.text}</p>
                <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{g.repaid ? `${formatDate(g.repaidAt ?? g.at)} 갚음` : `${formatDate(g.at)} 받음`}</span>
              </div>
              <button
                type="button"
                onClick={() => update((v) => deleteGift(v, id, g.id))}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5 }}
              >
                삭제
              </button>
            </div>
          ))}
      </div>

      <button type="button" onClick={removePerson} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", marginTop: 20 }}>
        이 사람 전체 삭제
      </button>
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
