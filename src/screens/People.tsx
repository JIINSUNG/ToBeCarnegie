import { useState } from "react";
import { useSession } from "../session";
import { searchPeople } from "../lib/people";

export function People({ onOpen, onAdd, onBack }: { onOpen: (id: string) => void; onAdd: () => void; onBack: () => void }) {
  const { vault } = useSession();
  const [q, setQ] = useState("");
  const list = vault ? searchPeople(vault, q) : [];

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>사람 목록</h1>
        <button type="button" onClick={onAdd} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          + 추가
        </button>
      </div>

      <input
        placeholder="이름·태그·기록 내용 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 15 }}
      />

      {list.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
          {q ? "찾는 사람이 없어요." : "아직 적어둔 사람이 없어요."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--line)",
              background: "var(--card)",
              textAlign: "left",
            }}
          >
            <b style={{ fontSize: 15.5 }}>{p.name}</b>
            <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
              {p.tags.length > 0 ? p.tags.join(" · ") : `기록 ${p.notes.length}개`}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
