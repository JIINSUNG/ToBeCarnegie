import { useState } from "react";
import { useSession } from "../session";
import { allGroups, searchPeople } from "../lib/people";
import { relationshipTemp, upcomingBirthdays, type RelationshipTemp } from "../lib/derive";
import type { Person } from "../types";

const TEMP_COLOR: Record<RelationshipTemp, string> = {
  warm: "var(--accent)",
  normal: "var(--muted)",
  cooling: "var(--warn)",
  unknown: "var(--line)",
};

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function statusLine(person: Person): string {
  if (!person.lastContactAt) return "아직 연락 기록 없음";
  const temp = relationshipTemp(person);
  const label = temp === "warm" ? "최근 연락함" : temp === "normal" ? "연락함" : "연락 뜸해짐";
  return `${label} · ${formatDate(person.lastContactAt)}`;
}

export function People({ onOpen, onAdd, onBack }: { onOpen: (id: string) => void; onAdd: () => void; onBack: () => void }) {
  const { vault } = useSession();
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const searched = vault ? searchPeople(vault, q) : [];
  const list = groupFilter ? searched.filter((p) => (p.groups ?? []).includes(groupFilter)) : searched;
  const birthdaySoon = new Map((vault ? upcomingBirthdays(vault) : []).map((b) => [b.person.id, b.daysUntil]));
  const groups = vault ? allGroups(vault) : [];

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
        placeholder="이름·태그·기록·선물·좋아요 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 16 }}
      />

      {groups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
              aria-pressed={groupFilter === g}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: groupFilter === g ? "var(--accent)" : "var(--card)",
                color: groupFilter === g ? "var(--accent-fg)" : "var(--fg2)",
              }}
            >
              👥 {g}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
          {groupFilter ? "이 그룹엔 아직 사람이 없어요." : q ? "찾는 사람이 없어요." : "아직 적어둔 사람이 없어요."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((p) => {
          const temp = relationshipTemp(p);
          const daysUntilBirthday = birthdaySoon.get(p.id);
          const pendingGifts = (p.gifts ?? []).filter((g) => !g.repaid).length;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid var(--line)",
                background: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: TEMP_COLOR[temp],
                  color: "var(--accent-fg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {p.name.slice(0, 1)}
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 16 }}>{p.name}</b>
                  {daysUntilBirthday !== undefined && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--field)", borderRadius: 999, padding: "2px 7px" }}>
                      🎂 {daysUntilBirthday === 0 ? "오늘" : `D-${daysUntilBirthday}`}
                    </span>
                  )}
                  {pendingGifts > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warn)", background: "var(--field)", borderRadius: 999, padding: "2px 7px" }}>
                      🎁 갚을 선물 {pendingGifts}
                    </span>
                  )}
                </div>

                {p.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {p.tags.map((t) => (
                      <span key={t} style={{ fontSize: 11.5, color: "var(--fg2)", background: "var(--field)", borderRadius: 999, padding: "2px 8px" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{statusLine(p)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
