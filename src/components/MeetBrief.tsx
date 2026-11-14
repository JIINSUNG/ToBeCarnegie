// "만나기 전 30초 브리핑" — 약속 직전에 사람 카드를 다 훑지 않아도 되게, 꼭 떠올릴 것만 한 화면에.
// 위에서부터 중요도 순: 조심할 것 → 물어볼 것 → 최근 근황 → 좋아하는 것 → 다가오는 날·갚을 것 → 나의 다짐.
import { useSession } from "../session";
import { buildMeetBrief } from "../lib/meet-brief";
import { CONTACT_KIND_LABEL, toggleFollowUp } from "../lib/contacts";
import { APPRECIATION_KIND } from "../lib/appreciations";
import { RELATIONSHIP_TEMP_LABEL } from "../lib/derive";
import { formatDate, timeAgo } from "../lib/format";

export function MeetBrief({ personId, onClose, onEdit }: { personId: string; onClose: () => void; onEdit: () => void }) {
  const { vault, update } = useSession();
  const b = vault ? buildMeetBrief(vault, personId) : null;
  if (!b) return null;
  const p = b.person;
  const lastAt = b.lastContact?.at ?? b.lastContactAt;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 }}>
          ← 카드로
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>☕ 만나기 전 30초</span>
      </div>

      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>
          {p.name}
          {p.nickname && <span style={{ fontSize: 15, fontWeight: 400, color: "var(--muted)" }}> ({p.nickname})</span>}
        </h1>
        {p.honorific && <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg2)" }}>💬 {p.honorific}</p>}
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          {RELATIONSHIP_TEMP_LABEL[b.temp]}
          {lastAt && ` · 마지막 연락 ${timeAgo(lastAt)}`}
        </p>
      </div>

      {b.empty && (
        <Box>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)" }}>아직 적어둔 게 거의 없어요. 만나고 나서 들은 걸 기록해두면 다음 브리핑이 채워져요.</p>
          <button type="button" onClick={onEdit} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--accent)", fontSize: 13, padding: 0 }}>
            정보 추가하러 가기 →
          </button>
        </Box>
      )}

      {b.avoidTopics.length > 0 && (
        <Box title="⚠️ 조심할 이야기" tone="warn">
          <Chips items={b.avoidTopics} tone="warn" />
        </Box>
      )}

      {b.followUps.length > 0 && (
        <Box title="🙋 물어볼 것">
          {b.followUps.map((f) => (
            <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
              <input type="checkbox" checked={f.done} onChange={() => update((v) => toggleFollowUp(v, personId, f.id))} style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span>{f.text}</span>
            </label>
          ))}
        </Box>
      )}

      {(b.lastContact || b.recentNotes.length > 0) && (
        <Box title="📰 최근 근황">
          {b.lastContact && (
            <p style={{ margin: 0, fontSize: 13.5 }}>
              <span style={{ color: "var(--muted)" }}>
                {formatDate(b.lastContact.at)} {CONTACT_KIND_LABEL[b.lastContact.kind]}
              </span>
              {b.lastContact.memo && ` — ${b.lastContact.memo}`}
            </p>
          )}
          {b.recentNotes.map((n) => (
            <p key={n.id} style={{ margin: 0, fontSize: 13.5 }}>
              · {n.text} <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(n.at)}</span>
            </p>
          ))}
        </Box>
      )}

      {(b.likes.length > 0 || b.dislikes.length > 0) && (
        <Box title="❤️ 취향">
          {b.likes.length > 0 && <Chips items={b.likes} />}
          {b.dislikes.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>안 좋아해요</span>
              <Chips items={b.dislikes} tone="muted" />
            </>
          )}
        </Box>
      )}

      {(b.upcoming.length > 0 || b.unrepaidGifts.length > 0) && (
        <Box title="🎁 챙길 것">
          {b.upcoming.map((u) => (
            <p key={u.label} style={{ margin: 0, fontSize: 13.5 }}>
              {u.label} <b style={{ color: "var(--accent)" }}>{u.daysUntil === 0 ? "오늘!" : `D-${u.daysUntil}`}</b>
            </p>
          ))}
          {b.unrepaidGifts.map((g) => (
            <p key={g.id} style={{ margin: 0, fontSize: 13.5 }}>
              받은 것: {g.text}
              {g.repaidWith && <span style={{ color: "var(--muted)" }}> → {g.repaidWith}로 갚을 생각</span>}
            </p>
          ))}
        </Box>
      )}

      {(b.intentions.length > 0 || b.lastAppreciation || b.inspiration) && (
        <Box title="🌱 나의 마음가짐">
          {b.intentions.map((t) => (
            <p key={t} style={{ margin: 0, fontSize: 13.5 }}>
              · {t}
            </p>
          ))}
          {b.lastAppreciation && (
            <p style={{ margin: 0, fontSize: 13.5 }}>
              {APPRECIATION_KIND[b.lastAppreciation.kind].icon} {b.lastAppreciation.text}
              {b.lastAppreciation.kind === "thanks" && !b.lastAppreciation.expressed && <b style={{ color: "var(--accent)" }}> — 아직 고맙다고 못 했어요</b>}
            </p>
          )}
          {b.inspiration && <p style={{ margin: 0, fontSize: 13.5 }}>✨ 이 사람에게 배운 점: {b.inspiration.lesson || b.inspiration.text}</p>}
        </Box>
      )}
    </div>
  );
}

function Box({ title, tone, children }: { title?: string; tone?: "warn"; children: React.ReactNode }) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 14,
        borderRadius: 16,
        border: tone === "warn" ? "1.5px solid var(--warn)" : "1px solid var(--line)",
        background: "var(--card)",
      }}
    >
      {title && <h2 style={{ fontSize: 13.5, margin: 0, color: tone === "warn" ? "var(--warn)" : "var(--fg2)" }}>{title}</h2>}
      {children}
    </section>
  );
}

function Chips({ items, tone }: { items: string[]; tone?: "warn" | "muted" }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((t) => (
        <span
          key={t}
          style={{
            fontSize: 13.5,
            padding: "5px 11px",
            borderRadius: 999,
            background: "var(--field)",
            color: tone === "warn" ? "var(--warn)" : tone === "muted" ? "var(--muted)" : "var(--fg)",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
