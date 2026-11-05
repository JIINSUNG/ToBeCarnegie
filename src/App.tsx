import { SessionProvider, useSession } from "./session";
import { Lock } from "./screens/Lock";
import { Home } from "./screens/Home";

function Gate() {
  const { status } = useSession();
  if (status === "loading") return null;
  if (status === "unlocked") return <Home />;
  return <Lock />;
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
