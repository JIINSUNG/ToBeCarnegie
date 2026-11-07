import { useRef, useState } from "react";
import { useSession } from "../session";
import {
  backupCodeToFile,
  backupFileToCode,
  parseBackupFile,
  serializeBackupFile,
  type BackupFile,
} from "../lib/backup";
import { shouldRemindBackup } from "../lib/derive";
import { isPasskeySupported } from "../lib/passkey";
import { addCustomWisdom, removeCustomWisdom } from "../lib/people";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";

function downloadBackupFile(file: BackupFile) {
  const blob = new Blob([serializeBackupFile(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `관계노트-백업-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

export function Settings({ onBack }: { onBack: () => void }) {
  const {
    vault,
    update,
    exportBackup,
    restoreBackup,
    hasPasskey,
    registerPasskey,
    removePasskey,
    syncConfigured,
    syncNow,
    syncStatus,
    lastSyncedAt,
    error: syncError,
  } = useSession();
  const [code, setCode] = useState("");
  const [pasteCode, setPasteCode] = useState("");
  const [incoming, setIncoming] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [wisdomDraft, setWisdomDraft] = useState("");
  const [wisdomError, setWisdomError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddWisdom = () => {
    const text = wisdomDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setWisdomError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    update((v) => addCustomWisdom(v, text));
    setWisdomDraft("");
    setWisdomError(null);
  };

  const handleRemoveWisdom = (id: string) => {
    update((v) => removeCustomWisdom(v, id));
  };

  const handleSync = async () => {
    const ok = await syncNow();
    if (ok) {
      setMessage("동기화했어요.");
      setError(null);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyBusy(true);
    const ok = await registerPasskey("관계노트");
    setPasskeyBusy(false);
    if (ok) {
      setMessage("패스키를 등록했어요. 다음부턴 암호 대신 패스키로 잠금을 풀 수 있어요.");
      setError(null);
    }
  };

  const handleRemovePasskey = () => {
    if (!confirm("등록된 패스키를 지울까요? 이후엔 암호로만 잠금을 풀 수 있어요.")) return;
    removePasskey();
    setMessage("패스키를 지웠어요.");
  };

  const handleExport = async () => {
    const file = await exportBackup();
    if (!file) return;
    downloadBackupFile(file);
    setCode(backupFileToCode(file));
    setMessage("백업 파일을 내려받았어요.");
    setError(null);
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setIncoming(parseBackupFile(text));
      setMessage(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "백업 파일을 읽을 수 없어요.");
      setIncoming(null);
    }
    e.target.value = "";
  };

  const handlePasteCode = () => {
    try {
      setIncoming(backupCodeToFile(pasteCode));
      setMessage(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "백업 코드를 읽을 수 없어요.");
      setIncoming(null);
    }
  };

  const handleRestore = async (mode: "merge" | "overwrite") => {
    if (!incoming) return;
    if (mode === "overwrite" && !confirm("지금 가지고 있는 기록을 백업 내용으로 완전히 바꿀까요? 되돌릴 수 없어요.")) {
      return;
    }
    const ok = await restoreBackup(incoming, mode);
    if (ok) {
      setMessage(mode === "merge" ? "백업과 합쳤어요." : "백업 내용으로 덮어썼어요.");
      setIncoming(null);
      setPasteCode("");
    }
    setError(null);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>설정</h1>
        <span style={{ width: 40 }} />
      </div>

      {vault && shouldRemindBackup(vault) && (
        <p style={{ margin: 0, padding: "10px 12px", borderRadius: "var(--radius)", background: "var(--field)", color: "var(--warn)", fontSize: 13 }}>
          백업한 지 좀 됐어요. 지금 백업해두는 걸 추천해요.
        </p>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>백업 내보내기</h2>
        <p style={hintStyle}>기록은 전부 암호화된 채로만 내보내져요.</p>
        <button type="button" onClick={handleExport} style={primaryBtnStyle}>
          백업 파일 내려받기
        </button>
        {code && (
          <label style={fieldStyle}>
            <span>또는 코드로 복사해서 옮기기</span>
            <textarea readOnly rows={3} value={code} style={{ ...inputStyle, fontSize: 16, fontFamily: "monospace" }} onFocus={(e) => e.currentTarget.select()} />
          </label>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>나만의 한마디 문구</h2>
        <p style={hintStyle}>홈 화면 "오늘의 한마디"에 직접 쓴 문구도 섞여서 나와요.</p>
        <label style={fieldStyle}>
          <textarea
            rows={2}
            value={wisdomDraft}
            onChange={(e) => {
              setWisdomDraft(e.target.value);
              setWisdomError(null);
            }}
            placeholder="예: 작은 약속도 꼭 지켜라."
            style={{ ...inputStyle, fontSize: 16 }}
          />
        </label>
        {wisdomError && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{wisdomError}</p>}
        <button type="button" onClick={handleAddWisdom} disabled={!wisdomDraft.trim()} style={secondaryBtnStyle}>
          추가
        </button>
        {(vault?.customWisdom ?? []).length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {(vault?.customWisdom ?? []).map((w) => (
              <li key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius)", background: "var(--field)" }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{w.text}</span>
                <button type="button" onClick={() => handleRemoveWisdom(w.id)} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, padding: 0 }}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {syncConfigured && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>동기화</h2>
          <p style={hintStyle}>구글 계정으로 다른 기기와 맞춰요. 여기서도 암호화된 채로만 오가요(처음엔 구글 로그인 창이 떠요).</p>
          <button type="button" onClick={handleSync} disabled={syncStatus === "syncing"} style={primaryBtnStyle}>
            {syncStatus === "syncing" ? "동기화 중…" : "지금 동기화"}
          </button>
          {syncStatus === "error" && syncError ? (
            <p style={{ ...hintStyle, color: "var(--warn)" }}>⚠️ {syncError}</p>
          ) : lastSyncedAt ? (
            <p style={hintStyle}>✓ 마지막 동기화: {timeAgo(lastSyncedAt)}</p>
          ) : (
            <p style={hintStyle}>아직 동기화한 적 없어요.</p>
          )}
        </section>
      )}

      {isPasskeySupported() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>패스키</h2>
          <p style={hintStyle}>
            {hasPasskey ? "이 기기에 패스키가 등록돼 있어요. 암호 대신 패스키로 잠금을 풀 수 있어요." : "매번 암호 치기 귀찮으면 이 기기에 패스키를 등록해두세요."}
          </p>
          {hasPasskey ? (
            <button type="button" onClick={handleRemovePasskey} style={{ ...secondaryBtnStyle, color: "var(--warn)" }}>
              패스키 지우기
            </button>
          ) : (
            <button type="button" onClick={handleRegisterPasskey} disabled={passkeyBusy} style={primaryBtnStyle}>
              {passkeyBusy ? "등록 중…" : "패스키 등록하기"}
            </button>
          )}
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>백업 복원</h2>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handlePickFile} style={{ fontSize: 13 }} />
        <label style={fieldStyle}>
          <span>또는 백업 코드 붙여넣기</span>
          <textarea
            rows={3}
            value={pasteCode}
            onChange={(e) => setPasteCode(e.target.value)}
            placeholder="백업 코드를 붙여넣으세요"
            style={{ ...inputStyle, fontSize: 16, fontFamily: "monospace" }}
          />
          <button type="button" onClick={handlePasteCode} disabled={!pasteCode.trim()} style={secondaryBtnStyle}>
            코드 읽기
          </button>
        </label>

        {incoming && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={hintStyle}>백업을 불러왔어요. 어떻게 반영할까요?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => handleRestore("merge")} style={primaryBtnStyle}>
                합치기
              </button>
              <button type="button" onClick={() => handleRestore("overwrite")} style={{ ...secondaryBtnStyle, color: "var(--warn)" }}>
                덮어쓰기
              </button>
            </div>
          </div>
        )}
      </section>

      {message && <p style={{ color: "var(--ok)", fontSize: 13, margin: 0 }}>{message}</p>}
      {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)" };
const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const hintStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 12.5, margin: 0 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg)", resize: "vertical" };
const primaryBtnStyle: React.CSSProperties = { alignSelf: "flex-start", padding: "9px 16px", borderRadius: 999, border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 };
const secondaryBtnStyle: React.CSSProperties = { alignSelf: "flex-start", padding: "9px 16px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg)", fontSize: 13.5 };
