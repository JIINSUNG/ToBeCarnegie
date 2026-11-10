import { useSession } from "../session";
import { buildBriefing } from "../lib/derive";
import { stickyHeaderStyle } from "../lib/layout";

export function Briefing({ onOpenPerson, onSettings, onBack }: { onOpenPerson: (id: string) => void; onSettings: () => void; onBack: () => void }) {
  const { vault } = useSession();
  const briefing = vault ? buildBriefing(vault) : null;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>브리핑</h1>
        <span style={{ width: 40 }} />
      </div>

      {!briefing ||
      (briefing.upcomingBirthdays.length === 0 &&
        briefing.upcomingAnniversaries.length === 0 &&
        briefing.staleContacts.length === 0 &&
        !briefing.shouldBackup) ? (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>지금은 딱히 알려드릴 게 없어요.</p>
      ) : (
        <>
          {briefing.shouldBackup && (
            <section style={sectionStyle}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--warn)" }}>백업한 지 좀 됐어요.</p>
              <button type="button" onClick={onSettings} style={linkBtnStyle}>
                설정에서 백업하기 →
              </button>
            </section>
          )}

          {briefing.upcomingBirthdays.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={headingStyle}>다가오는 생일</h2>
              {briefing.upcomingBirthdays.map(({ person, daysUntil }) => (
                <button key={person.id} type="button" onClick={() => onOpenPerson(person.id)} style={rowStyle}>
                  <span>{person.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{daysUntil === 0 ? "오늘!" : `${daysUntil}일 후`}</span>
                </button>
              ))}
            </section>
          )}

          {briefing.upcomingAnniversaries.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={headingStyle}>다가오는 기념일</h2>
              {briefing.upcomingAnniversaries.map(({ person, anniversary, daysUntil, years }) => (
                <button key={anniversary.id} type="button" onClick={() => onOpenPerson(person.id)} style={rowStyle}>
                  <span>
                    {person.name} · {anniversary.label}
                    {years > 0 && ` (${years}주년)`}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{daysUntil === 0 ? "오늘!" : `${daysUntil}일 후`}</span>
                </button>
              ))}
            </section>
          )}

          {briefing.staleContacts.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={headingStyle}>연락이 뜸한 사람</h2>
              {briefing.staleContacts.map(({ person, daysSinceContact }) => (
                <button key={person.id} type="button" onClick={() => onOpenPerson(person.id)} style={rowStyle}>
                  <span>{person.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{daysSinceContact}일째</span>
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const linkBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--accent)", fontSize: 13, padding: 0, alignSelf: "flex-start" };
const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)" };
const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--field)",
  textAlign: "left",
};
