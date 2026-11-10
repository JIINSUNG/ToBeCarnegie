// 홈 화면 하단에 고정되는 안드로이드 스타일 탭바. 사람 상세·수정처럼 안으로 들어간 화면에서는
// (각자 자기 "← 목록"/"취소"로 돌아가니) 숨기고, 최상위 화면들에서만 보여준다.
export type TabKey = "home" | "people" | "groups" | "quotes" | "briefing" | "settings";

const TABS: [TabKey, string, string][] = [
  ["home", "🏠", "홈"],
  ["people", "👤", "사람"],
  ["groups", "👥", "그룹"],
  ["quotes", "💬", "글귀"],
  ["briefing", "📋", "브리핑"],
  ["settings", "⚙️", "설정"],
];

export const TAB_BAR_HEIGHT = 58;

export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav
      aria-label="메뉴"
      style={{
        flexShrink: 0,
        background: "var(--card)",
        borderTop: "1px solid var(--line)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
          height: TAB_BAR_HEIGHT,
        }}
      >
        {TABS.map(([key, icon, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => onChange(key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              fontSize: 11,
              fontWeight: tab === key ? 700 : 500,
              color: tab === key ? "var(--accent)" : "var(--muted)",
            }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
