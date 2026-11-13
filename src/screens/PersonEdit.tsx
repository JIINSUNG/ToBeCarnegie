import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { addGroupName, allGroups, createPerson, findPerson, isValidBirthdayYear, isValidMbti, updatePerson } from "../lib/people";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";

/** 연도를 모를 때 달력을 띄우기 위한 자리표시 연도 — 2월 29일도 고를 수 있게 윤년으로 둔다. */
const PLACEHOLDER_YEAR = 2000;

export function PersonEdit({ id, onDone, onCancel }: { id: string | null; onDone: (id: string) => void; onCancel: () => void }) {
  const { vault, update } = useSession();
  const existing = id && vault ? findPerson(vault, id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [nickname, setNickname] = useState(existing?.nickname ?? "");
  const [dateValue, setDateValue] = useState(existing?.birthday ? `${existing.birthdayYear ?? PLACEHOLDER_YEAR}-${existing.birthday}` : "");
  const [yearUnknown, setYearUnknown] = useState(existing?.birthday ? !existing.birthdayYear : false);
  const [mbti, setMbti] = useState(existing?.mbti ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  const [metStory, setMetStory] = useState(existing?.metStory ?? "");
  const [honorific, setHonorific] = useState(existing?.honorific ?? "");
  const [contactFrequencyDays, setContactFrequencyDays] = useState(existing?.contactFrequencyDays ? String(existing.contactFrequencyDays) : "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(existing?.groups ?? []);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupDraft, setNewGroupDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existingGroups = vault ? allGroups(vault) : [];

  const toggleGroup = (g: string) => {
    setSelectedGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const confirmAddGroup = () => {
    const name = newGroupDraft.trim();
    setAddingGroup(false);
    setNewGroupDraft("");
    if (!name) return;
    const reason = checkSensitive(name);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    if (!existingGroups.includes(name)) update((v) => addGroupName(v, name));
    setSelectedGroups((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름을 적어주세요.");
      return;
    }
    const trimmedMbti = mbti.trim().toUpperCase();
    const nameIssue = checkSensitive(trimmedName) ?? checkSensitive(tags);
    if (nameIssue) {
      setError(BLOCK_REASON_LABEL[nameIssue]);
      return;
    }
    let birthday: string | undefined;
    let birthdayYear: number | undefined;
    if (dateValue) {
      const [y, m, d] = dateValue.split("-");
      birthday = `${m}-${d}`;
      if (!yearUnknown) {
        const year = Number(y);
        if (!isValidBirthdayYear(year)) {
          setError("태어난 연도가 올바르지 않아요.");
          return;
        }
        birthdayYear = year;
      }
    }
    if (trimmedMbti && !isValidMbti(trimmedMbti)) {
      setError("MBTI는 INTJ처럼 4글자로 적어주세요.");
      return;
    }
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const groupList = selectedGroups;
    const freeTextIssue = checkSensitive(nickname) ?? checkSensitive(metStory) ?? checkSensitive(honorific);
    if (freeTextIssue) {
      setError(BLOCK_REASON_LABEL[freeTextIssue]);
      return;
    }
    const frequency = contactFrequencyDays ? Number(contactFrequencyDays) : undefined;

    if (existing) {
      update((v) =>
        updatePerson(v, existing.id, {
          name: trimmedName,
          birthday,
          birthdayYear,
          mbti: trimmedMbti || undefined,
          gender: gender || undefined,
          nickname: nickname.trim() || undefined,
          metStory: metStory.trim() || undefined,
          honorific: honorific.trim() || undefined,
          contactFrequencyDays: frequency,
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
      return updatePerson(withPerson, newId, {
        birthday,
        birthdayYear,
        mbti: trimmedMbti || undefined,
        gender: gender || undefined,
        nickname: nickname.trim() || undefined,
        metStory: metStory.trim() || undefined,
        honorific: honorific.trim() || undefined,
        contactFrequencyDays: frequency,
        tags: tagList,
        groups: groupList,
      });
    });
    onDone(newId);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <span>별명 (선택)</span>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 꼬맹이" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>생일 (선택)</span>
        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} style={inputStyle} />
        {dateValue && (
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
            <input type="checkbox" checked={yearUnknown} onChange={(e) => setYearUnknown(e.target.checked)} />
            태어난 연도는 몰라요 (월·일만 저장돼요)
          </label>
        )}
      </label>

      <label style={fieldStyle}>
        <span>MBTI (선택)</span>
        <input value={mbti} onChange={(e) => setMbti(e.target.value)} placeholder="INTJ" style={inputStyle} maxLength={4} />
      </label>

      <div style={fieldStyle}>
        <span>성별 (선택)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["여성", "남성", "기타"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender((prev) => (prev === g ? "" : g))}
              aria-pressed={gender === g}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: gender === g ? "var(--accent)" : "var(--field)",
                color: gender === g ? "var(--accent-fg)" : "var(--fg2)",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <label style={fieldStyle}>
        <span>첫 만남 (선택)</span>
        <input value={metStory} onChange={(e) => setMetStory(e.target.value)} placeholder="예: 2022년, 동호회 소개로 처음 만남" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>호칭·말투 (선택)</span>
        <input value={honorific} onChange={(e) => setHonorific(e.target.value)} placeholder="예: 형이라고 부름 · 반말" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>연락 주기 (선택)</span>
        <select value={contactFrequencyDays} onChange={(e) => setContactFrequencyDays(e.target.value)} style={inputStyle}>
          <option value="">설정 안 함 (기본 기준으로 봐요)</option>
          <option value="14">2주마다 연락</option>
          <option value="30">한 달마다 연락</option>
          <option value="60">두 달마다 연락</option>
          <option value="90">세 달마다 연락</option>
          <option value="180">반 년마다 연락</option>
          <option value="365">1년마다 연락</option>
        </select>
      </label>

      <label style={fieldStyle}>
        <span>태그 (선택, 쉼표로 구분)</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="대학동기, 헬스장" style={inputStyle} />
      </label>

      <div style={fieldStyle}>
        <span>그룹 (선택)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {existingGroups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGroup(g)}
              aria-pressed={selectedGroups.includes(g)}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: selectedGroups.includes(g) ? "var(--accent)" : "var(--field)",
                color: selectedGroups.includes(g) ? "var(--accent-fg)" : "var(--fg2)",
              }}
            >
              {g}
            </button>
          ))}
          {addingGroup ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={newGroupDraft}
                onChange={(e) => setNewGroupDraft(e.target.value)}
                placeholder="새 그룹 이름"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAddGroup();
                  if (e.key === "Escape") {
                    setAddingGroup(false);
                    setNewGroupDraft("");
                  }
                }}
                onBlur={confirmAddGroup}
                style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--card)", fontSize: 16, color: "var(--fg)", width: 120 }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px dashed var(--line)",
                background: "none",
                color: "var(--accent)",
              }}
            >
              + 새 그룹
            </button>
          )}
        </div>
        {existingGroups.length === 0 && !addingGroup && <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>아직 그룹이 없어요. &apos;+ 새 그룹&apos;으로 만들어보세요.</p>}
      </div>

      {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
    </main>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
// 16px 미만이면 iOS Safari가 포커스 시 자동으로 확대해버려서(그리고 잘 안 풀림) 16으로 고정.
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 16, color: "var(--fg)" };
