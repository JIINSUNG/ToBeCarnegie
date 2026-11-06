import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { createPerson, findPerson, isValidBirthday, updatePerson } from "../lib/people";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";

export function PersonEdit({ id, onDone, onCancel }: { id: string | null; onDone: (id: string) => void; onCancel: () => void }) {
  const { vault, update } = useSession();
  const existing = id && vault ? findPerson(vault, id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [birthday, setBirthday] = useState(existing?.birthday ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름을 적어주세요.");
      return;
    }
    const nameIssue = checkSensitive(trimmedName) ?? checkSensitive(tags);
    if (nameIssue) {
      setError(BLOCK_REASON_LABEL[nameIssue]);
      return;
    }
    if (birthday && !isValidBirthday(birthday)) {
      setError("생일은 MM-DD 형식으로 적어주세요 (예: 03-15).");
      return;
    }
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (existing) {
      update((v) => updatePerson(v, existing.id, { name: trimmedName, birthday: birthday || undefined, tags: tagList }));
      onDone(existing.id);
      return;
    }

    const newId = nanoid();
    update((v) => {
      const withPerson = createPerson(v, trimmedName, newId);
      return updatePerson(withPerson, newId, { birthday: birthday || undefined, tags: tagList });
    });
    onDone(newId);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onCancel} style={linkStyle}>
          취소
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>{existing ? "수정" : "새 사람"}</h1>
        <button type="button" onClick={save} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          저장
        </button>
      </div>

      <label style={fieldStyle}>
        <span>이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" style={inputStyle} autoFocus />
      </label>

      <label style={fieldStyle}>
        <span>생일 (선택, MM-DD)</span>
        <input value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="03-15" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>태그 (선택, 쉼표로 구분)</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="대학동기, 헬스장" style={inputStyle} />
      </label>

      {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 15, color: "var(--fg)" };
