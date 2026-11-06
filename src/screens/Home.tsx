import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { addNote, createPerson, findPeopleByName } from "../lib/people";
import { parseQuickEntry } from "../lib/parser";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { pickRandomWisdom } from "../lib/wisdom";

export function Home({
  onPeople,
  onBriefing,
  onSettings,
  onOpenPerson,
}: {
  onPeople: () => void;
  onBriefing: () => void;
  onSettings: () => void;
  onOpenPerson: (id: string) => void;
}) {
  const { vault, lock, update } = useSession();
  const [quick, setQuick] = useState("");
  const [quickMsg, setQuickMsg] = useState<{ type: "ok" | "error"; text: string; personId?: string } | null>(null);
  const [wisdom, setWisdom] = useState(() => pickRandomWisdom());

  const submitQuick = () => {
    const parsed = parseQuickEntry(quick);
    if (!parsed) {
      setQuickMsg({ type: "error", text: '"이름 - 내용" 형태로 적어주세요 (예: 민수 - 커피는 아메리카노)' });
      return;
    }
    const reason = checkSensitive(parsed.text);
    if (reason) {
      setQuickMsg({ type: "error", text: BLOCK_REASON_LABEL[reason] });
      return;
    }
    if (!vault) return;

    const matches = findPeopleByName(vault, parsed.name);
    if (matches.length > 1) {
      setQuickMsg({ type: "error", text: `"${parsed.name}"인 사람이 여러 명이라 목록에서 직접 골라주세요.` });
      return;
    }

    if (matches.length === 1) {
      const personId = matches[0].id;
      update((v) => addNote(v, personId, parsed.text));
      setQuickMsg({ type: "ok", text: `${parsed.name}에게 기록했어요.`, personId });
    } else {
      const newId = nanoid();
      update((v) => addNote(createPerson(v, parsed.name, newId), newId, parsed.text));
      setQuickMsg({ type: "ok", text: `${parsed.name}을(를) 새로 만들고 기록했어요.`, personId: newId });
    }
    setQuick("");
  };

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

      <div style={wisdomBoxStyle}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>오늘의 한마디</span>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--accent-fg)" }}>{wisdom.text}</p>
        <button
          type="button"
          onClick={() => setWisdom(pickRandomWisdom(wisdom.id))}
          style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--accent-fg)", opacity: 0.85, fontSize: 12.5, padding: 0 }}
        >
          다른 문구 →
        </button>
      </div>

      {vault && vault.people.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: "10vh" }}>
          아직 적어둔 사람이 없어요.
          <br />
          지인에 대해 들은 걸 편하게 기록해보세요.
        </p>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{vault?.people.length}명 기록됨</p>
      )}

      <div style={quickBoxStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg2)" }}>한 줄 빠른 기록</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="민수 - 커피는 아메리카노"
            value={quick}
            onChange={(e) => {
              setQuick(e.target.value);
              setQuickMsg(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            style={{ flex: 1, padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 14 }}
          />
          <button type="button" onClick={submitQuick} disabled={!quick.trim()} style={quickBtnStyle}>
            기록
          </button>
        </div>
        {quickMsg && (
          <p style={{ margin: 0, fontSize: 12.5, color: quickMsg.type === "error" ? "var(--warn)" : "var(--ok)", display: "flex", alignItems: "center", gap: 8 }}>
            {quickMsg.text}
            {quickMsg.type === "ok" && quickMsg.personId && (
              <button type="button" onClick={() => onOpenPerson(quickMsg.personId!)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, padding: 0 }}>
                보기 →
              </button>
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onPeople}
        style={{
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

const wisdomBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 16,
  borderRadius: 16,
  background: "var(--accent)",
};

const quickBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const quickBtnStyle: React.CSSProperties = {
  padding: "0 16px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 13.5,
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 16px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 14,
};
