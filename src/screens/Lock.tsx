import { useState, type FormEvent } from "react";
import { useSession } from "../session";

const MIN_LENGTH = 8;

export function Lock() {
  const { status, error, syncConfigured, setup, unlock, resetDevice } = useSession();
  const isSetup = status === "needs-setup";
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    const warning = syncConfigured
      ? "이 기기에 저장된 기록을 지우고 새로 시작할까요? 동기화를 켜둔 적이 있다면, 새로 시작한 뒤 '지금 동기화'를 누르면 클라우드에 있던 내용을 다시 받아올 수 있어요."
      : "이 기기에 저장된 기록을 지우고 새로 시작할까요? 동기화를 켜둔 적이 없다면 이 기기의 기록은 되돌릴 수 없어요.";
    if (!window.confirm(warning)) return;
    setBusy(true);
    await resetDevice();
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
        <h1 style={{ fontSize: 22, margin: 0 }}>더나은</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 0" }}>
          {isSetup ? "이 기기에서 처음 쓰시는군요. 잠금 암호를 만들어주세요." : "암호를 입력해 잠금을 풀어주세요."}
        </p>
        {isSetup && (
          <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0" }}>
            이 암호는 이 기기만의 잠금이에요 — 다른 기기와 똑같이 맞출 필요 없어요. 설정에서 동기화를 켜면 기록은 자동으로 맞춰져요.
          </p>
        )}
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

      {isSetup && (
        <p style={{ color: "var(--muted)", fontSize: 12.5, textAlign: "center", margin: 0 }}>
          이 암호를 잊으면 기록을 되돌릴 방법이 없어요. 꼭 기억할 수 있는 걸로 만들어주세요.
        </p>
      )}

      {!isSetup && (
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, textAlign: "center" }}
        >
          암호가 기억 안 나거나 계속 안 풀리나요? 이 기기 기록 지우고 다시 시작하기
        </button>
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
