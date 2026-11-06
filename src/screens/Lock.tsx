import { useState, type FormEvent } from "react";
import { useSession } from "../session";

const MIN_LENGTH = 8;

export function Lock() {
  const { status, error, hasPasskey, syncConfigured, setup, unlock, unlockPasskey, joinFromCloud } = useSession();
  const isSetup = status === "needs-setup";
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitPasskey = async () => {
    setLocalError(null);
    setBusy(true);
    await unlockPasskey();
    setBusy(false);
  };

  const submitJoinFromCloud = async () => {
    setLocalError(null);
    if (!pass) {
      setLocalError("클라우드에서 쓰던 암호를 입력해주세요.");
      return;
    }
    setBusy(true);
    await joinFromCloud(pass);
    setBusy(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isSetup) {
      if (pass.length < MIN_LENGTH) {
        setLocalError(`암호는 최소 ${MIN_LENGTH}자 이상으로 해주세요.`);
        return;
      }
      if (pass !== confirm) {
        setLocalError("두 번 입력한 암호가 달라요.");
        return;
      }
      setBusy(true);
      await setup(pass);
      setBusy(false);
      return;
    }

    setBusy(true);
    const ok = await unlock(pass);
    setBusy(false);
    if (ok) setPass("");
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: "20vh" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>관계노트</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 0" }}>
          {isSetup ? "이 기기에서 처음 쓰시는군요. 잠금 암호를 만들어주세요." : "암호를 입력해 잠금을 풀어주세요."}
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="password"
          autoFocus
          autoComplete={isSetup ? "new-password" : "current-password"}
          placeholder="암호"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={inputStyle}
        />
        {isSetup && (
          <input
            type="password"
            autoComplete="new-password"
            placeholder="암호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
          />
        )}

        {(localError || error) && <p style={{ color: "var(--warn)", fontSize: 13.5, margin: 0 }}>{localError ?? error}</p>}

        <button type="submit" disabled={busy || !pass} style={buttonStyle}>
          {busy ? "처리 중…" : isSetup ? "시작하기" : "잠금 해제"}
        </button>
      </form>

      {!isSetup && hasPasskey && (
        <button type="button" onClick={submitPasskey} disabled={busy} style={passkeyButtonStyle}>
          패스키로 잠금 해제
        </button>
      )}

      {isSetup && syncConfigured && (
        <button type="button" onClick={submitJoinFromCloud} disabled={busy} style={passkeyButtonStyle}>
          다른 기기에서 이미 쓰고 있어요 (클라우드에서 불러오기)
        </button>
      )}

      {isSetup && (
        <p style={{ color: "var(--muted)", fontSize: 12.5, textAlign: "center", margin: 0 }}>
          이 암호를 잊으면 기록을 되돌릴 방법이 없어요. 꼭 기억할 수 있는 걸로 만들어주세요.
        </p>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 16,
  fontWeight: 600,
};

const passkeyButtonStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 15,
};
