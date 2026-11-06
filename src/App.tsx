import { useState } from "react";
import { SessionProvider, useSession } from "./session";
import { Lock } from "./screens/Lock";
import { Home } from "./screens/Home";
import { People } from "./screens/People";
import { PersonCard } from "./screens/PersonCard";
import { PersonEdit } from "./screens/PersonEdit";
import { Briefing } from "./screens/Briefing";
import { Settings } from "./screens/Settings";

type View =
  | { name: "home" }
  | { name: "people" }
  | { name: "card"; id: string }
  | { name: "edit"; id: string | null }
  | { name: "briefing" }
  | { name: "settings" };

function Gate() {
  const { status } = useSession();
  const [view, setView] = useState<View>({ name: "home" });

  if (status === "loading") return null;
  if (status !== "unlocked") return <Lock />;

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
      return (
        <People
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
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
