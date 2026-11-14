import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "./session";
import { Lock } from "./screens/Lock";
import { Home } from "./screens/Home";
import { People } from "./screens/People";
import { PersonCard } from "./screens/PersonCard";
import { PersonEdit } from "./screens/PersonEdit";
import { Briefing } from "./screens/Briefing";
import { Settings } from "./screens/Settings";
import { Quotes } from "./screens/Quotes";
import { Growth } from "./screens/Growth";
import { Goals } from "./screens/Goals";
import { TabBar, type TabKey } from "./components/TabBar";

type View =
  | { name: "home" }
  | { name: "people" }
  | { name: "groups" }
  | { name: "card"; id: string }
  | { name: "edit"; id: string | null }
  | { name: "quotes" }
  | { name: "growth" }
  | { name: "goals" }
  | { name: "briefing" }
  | { name: "settings" };

/** card/edit처럼 안으로 들어간 화면이 아니라, 하단 탭에 직접 대응되는 최상위 화면인지. */
function isTabView(name: View["name"]): name is TabKey {
  return (
    name === "home" ||
    name === "people" ||
    name === "groups" ||
    name === "quotes" ||
    name === "growth" ||
    name === "goals" ||
    name === "briefing" ||
    name === "settings"
  );
}

/** 화면 전체(body)가 아니라 이 가운데 영역만 스크롤되게 해서, 탭바와 각 화면 안의 sticky 헤더가
 * 모바일 브라우저 주소창 접힘/펴짐에 흔들리지 않고 항상 제자리에 있게 한다. */
function Shell({ children, tabBar }: { children: React.ReactNode; tabBar?: React.ReactNode }) {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "contain",
          WebkitOverflowScrolling: "touch",
          paddingInline: 16,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {children}
      </div>
      {tabBar}
    </div>
  );
}

function Gate() {
  const { status } = useSession();
  const [view, setView] = useState<View>({ name: "home" });
  const viewId = "id" in view ? view.id : null;

  // 입력칸에 포커스가 남아있는 채로 화면을 넘기면(예: 새 사람 저장 → 상세로 이동), iOS Safari가
  // 포커스 때문에 확대된 화면을 안 풀어줘서 다음 화면도 계속 확대돼 보인다 — 화면이 바뀌면
  // 포커스를 강제로 떼서 확대를 풀어준다.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [view.name, viewId]);

  if (status === "loading") return null;
  if (status !== "unlocked")
    return (
      <Shell>
        <Lock />
      </Shell>
    );

  const showTabBar = isTabView(view.name);

  const screen = (() => {
    switch (view.name) {
      case "home":
        return (
          <Home
            onPeople={() => setView({ name: "people" })}
            onBriefing={() => setView({ name: "briefing" })}
            onSettings={() => setView({ name: "settings" })}
            onOpenPerson={(id) => setView({ name: "card", id })}
          />
        );
      case "people":
      case "groups":
        return (
          <People
            key={view.name}
            initialGroupedView={view.name === "groups"}
            onBack={() => setView({ name: "home" })}
            onAdd={() => setView({ name: "edit", id: null })}
            onOpen={(id) => setView({ name: "card", id })}
          />
        );
      case "card":
        return (
          <PersonCard
            id={view.id}
            onBack={() => setView({ name: "people" })}
            onEdit={(id) => setView({ name: "edit", id })}
          />
        );
      case "edit":
        return (
          <PersonEdit
            id={view.id}
            onDone={(id) => setView({ name: "card", id })}
            onCancel={() => setView(view.id ? { name: "card", id: view.id } : { name: "people" })}
          />
        );
      case "quotes":
        return <Quotes onBack={() => setView({ name: "home" })} />;
      case "growth":
        return <Growth onBack={() => setView({ name: "home" })} />;
      case "goals":
        return <Goals onBack={() => setView({ name: "home" })} />;
      case "briefing":
        return (
          <Briefing
            onBack={() => setView({ name: "home" })}
            onSettings={() => setView({ name: "settings" })}
            onOpenPerson={(id) => setView({ name: "card", id })}
          />
        );
      case "settings":
        return <Settings onBack={() => setView({ name: "home" })} />;
    }
  })();

  return <Shell tabBar={showTabBar && <TabBar tab={view.name as TabKey} onChange={(tab) => setView({ name: tab } as View)} />}>{screen}</Shell>;
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
