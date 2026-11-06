import { useSession } from "../session";

export function Home({
  onPeople,
  onBriefing,
  onSettings,
}: {
  onPeople: () => void;
  onBriefing: () => void;
  onSettings: () => void;
}) {
  const { vault, lock } = useSession();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>관계노트</h1>
        <button
          type="button"
          onClick={lock}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13.5 }}
        >
          잠그기
        </button>
      </div>

      {vault && vault.people.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: "20vh" }}>
          아직 적어둔 사람이 없어요.
          <br />
          지인에 대해 들은 걸 편하게 기록해보세요.
        </p>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{vault?.people.length}명 기록됨</p>
      )}

      <button
        type="button"
        onClick={onPeople}
        style={{
          marginTop: 8,
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-fg)",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        사람 목록 보기
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onBriefing} style={secondaryBtnStyle}>
          브리핑
        </button>
        <button type="button" onClick={onSettings} style={secondaryBtnStyle}>
          설정
        </button>
      </div>
    </main>
  );
}

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 16px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 14,
};
