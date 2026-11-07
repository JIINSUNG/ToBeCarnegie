import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { allGroups, createPerson, findPerson, isValidBirthday, isValidBirthdayYear, isValidMbti, updatePerson } from "../lib/people";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";

export function PersonEdit({ id, onDone, onCancel }: { id: string | null; onDone: (id: string) => void; onCancel: () => void }) {
  const { vault, update } = useSession();
  const existing = id && vault ? findPerson(vault, id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [birthday, setBirthday] = useState(existing?.birthday ?? "");
  const [yearStr, setYearStr] = useState(existing?.birthdayYear ? String(existing.birthdayYear) : "");
  const [yearUnknown, setYearUnknown] = useState(!existing?.birthdayYear);
  const [mbti, setMbti] = useState(existing?.mbti ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [groups, setGroups] = useState(existing?.groups?.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);

  const existingGroups = vault ? allGroups(vault) : [];
  const currentGroupList = groups.split(",").map((g) => g.trim()).filter(Boolean);

  const toggleGroupSuggestion = (g: string) => {
    const has = currentGroupList.includes(g);
    const next = has ? currentGroupList.filter((x) => x !== g) : [...currentGroupList, g];
    setGroups(next.join(", "));
  };

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름을 적어주세요.");
      return;
    }
    const trimmedMbti = mbti.trim().toUpperCase();
    const nameIssue = checkSensitive(trimmedName) ?? checkSensitive(tags) ?? checkSensitive(groups);
    if (nameIssue) {
      setError(BLOCK_REASON_LABEL[nameIssue]);
      return;
    }
    if (birthday && !isValidBirthday(birthday)) {
      setError("생일은 MM-DD 형식으로 적어주세요 (예: 03-15).");
      return;
    }
    let birthdayYear: number | undefined;
    if (birthday && !yearUnknown) {
      const y = Number(yearStr.trim());
      if (!yearStr.trim() || !isValidBirthdayYear(y)) {
        setError("태어난 연도를 올바르게 적거나, 모르면 '몰라요'를 체크해주세요.");
        return;
      }
      birthdayYear = y;
    }
    if (trimmedMbti && !isValidMbti(trimmedMbti)) {
      setError("MBTI는 INTJ처럼 4글자로 적어주세요.");
      return;
    }
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const groupList = currentGroupList;

    if (existing) {
      update((v) =>
        updatePerson(v, existing.id, {
          name: trimmedName,
          birthday: birthday || undefined,
          birthdayYear,
          mbti: trimmedMbti || undefined,
          tags: tagList,
          groups: groupList,
        })
      );
      onDone(existing.id);
      return;
    }

    const newId = nanoid();
    update((v) => {
      const withPerson = createPerson(v, trimmedName, newId);
      return updatePerson(withPerson, newId, { birthday: birthday || undefined, birthdayYear, mbti: trimmedMbti || undefined, tags: tagList, groups: groupList });
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

      {birthday && (
        <label style={fieldStyle}>
          <span>태어난 연도 (선택)</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={yearUnknown ? "" : yearStr}
              onChange={(e) => setYearStr(e.target.value)}
              disabled={yearUnknown}
              placeholder="1992"
              inputMode="numeric"
              style={{ ...inputStyle, flex: 1, opacity: yearUnknown ? 0.5 : 1 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={yearUnknown} onChange={(e) => setYearUnknown(e.target.checked)} />
              몰라요
            </label>
          </div>
        </label>
      )}

      <label style={fieldStyle}>
        <span>MBTI (선택)</span>
        <input value={mbti} onChange={(e) => setMbti(e.target.value)} placeholder="INTJ" style={inputStyle} maxLength={4} />
      </label>

      <label style={fieldStyle}>
        <span>태그 (선택, 쉼표로 구분)</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="대학동기, 헬스장" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>그룹 (선택, 쉼표로 구분)</span>
        <input value={groups} onChange={(e) => setGroups(e.target.value)} placeholder="가족, 직장" style={inputStyle} />
        {existingGroups.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            {existingGroups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGroupSuggestion(g)}
                aria-pressed={currentGroupList.includes(g)}
                style={{
                  fontSize: 12.5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: currentGroupList.includes(g) ? "var(--accent)" : "var(--field)",
                  color: currentGroupList.includes(g) ? "var(--accent-fg)" : "var(--fg2)",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </label>

      {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
// 16px 미만이면 iOS Safari가 포커스 시 자동으로 확대해버려서(그리고 잘 안 풀림) 16으로 고정.
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 16, color: "var(--fg)" };
