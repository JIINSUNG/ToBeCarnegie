import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "./session";
import { Lock } from "./screens/Lock";
import { Home } from "./screens/Home";
import { People } from "./screens/People";
import { PersonCard } from "./screens/PersonCard";
import { PersonEdit } from "./screens/PersonEdit";
import { Briefing } from "./screens/Briefing";
import { Settings } from "./screens/Settings";
import { TabBar, TAB_BAR_HEIGHT, type TabKey } from "./components/TabBar";

type View =
  | { name: "home" }
  | { name: "people" }
  | { name: "groups" }
  | { name: "card"; id: string }
  | { name: "edit"; id: string | null }
  | { name: "briefing" }
  | { name: "settings" };

/** card/edit처럼 안으로 들어간 화면이 아니라, 하단 탭에 직접 대응되는 최상위 화면인지. */
function isTabView(name: View["name"]): name is TabKey {
  return name === "home" || name === "people" || name === "groups" || name === "briefing" || name === "settings";
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
  if (status !== "unlocked") return <Lock />;

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

  if (!showTabBar) return screen;

  return (
    <>
      <div style={{ paddingBottom: TAB_BAR_HEIGHT }}>{screen}</div>
      <TabBar tab={view.name as TabKey} onChange={(tab) => setView({ name: tab } as View)} />
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
