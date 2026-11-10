import { useState } from "react";
import { useSession } from "../session";
import {
  addAnniversary,
  addDislike,
  addFavor,
  addGift,
  addIntention,
  addLike,
  addNote,
  deleteAnniversary,
  deleteGift,
  deleteIntention,
  deleteNote,
  deletePerson,
  findPerson,
  isValidAnniversaryDate,
  removeDislike,
  removeFavor,
  removeLike,
  setGiftRepaidWith,
  setLastContact,
  toggleGiftRepaid,
  touchLastContact,
} from "../lib/people";
import { relationshipTemp, RELATIONSHIP_TEMP_LABEL, type RelationshipTemp } from "../lib/derive";
import { pickWisdomForPerson } from "../lib/wisdom";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import type { Person } from "../types";
import { stickyHeaderStyle } from "../lib/layout";

const TEMP_COLOR: Record<RelationshipTemp, string> = {
  warm: "var(--accent)",
  normal: "var(--muted)",
  cooling: "var(--warn)",
  unknown: "var(--line)",
};

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function ChipListField({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    onAdd(text);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--fg2)", fontWeight: 600 }}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={inputStyle}
        />
        <button type="button" onClick={submit} disabled={!draft.trim()} style={smallAddBtnStyle}>
          추가
        </button>
      </div>
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((t, i) => (
            <button key={i} type="button" onClick={() => onRemove(i)} aria-label={`${t} 삭제`} style={chipStyle}>
              {t} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnniversarySection({ person, onAdd, onDelete }: { person: Person; onAdd: (label: string, date: string) => void; onDelete: (id: string) => void }) {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const l = label.trim();
    if (!l || !date) {
      setError("이름과 날짜를 모두 입력해주세요.");
      return;
    }
    const reason = checkSensitive(l);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    if (!isValidAnniversaryDate(date)) {
      setError("날짜 형식이 올바르지 않아요.");
      return;
    }
    setError(null);
    onAdd(l, date);
    setLabel("");
    setDate("");
  };

  const anniversaries = [...(person.anniversaries ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>기념일</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="예: 처음 만난 날"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setError(null);
          }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
      </div>
      <button type="button" onClick={submit} disabled={!label.trim() || !date} style={{ ...smallAddBtnStyle, alignSelf: "flex-start" }}>
        추가
      </button>
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}

      {anniversaries.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>등록된 기념일이 없어요.</p>
      ) : (
        anniversaries.map((a) => (
          <div key={a.id} style={rowStyle}>
            <div>
              <p style={{ margin: 0, fontSize: 14 }}>{a.label}</p>
              <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{a.date}</span>
            </div>
            <button type="button" onClick={() => onDelete(a.id)} style={deleteLinkStyle}>
              삭제
            </button>
          </div>
        ))
      )}
    </section>
  );
}

function IntentionSection({ person, onAdd, onDelete }: { person: Person; onAdd: (text: string) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    onAdd(text);
    setDraft("");
  };

  const intentions = [...(person.intentions ?? [])].sort((a, b) => b.at - a.at);

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>다짐</h2>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>이 사람한텐 이렇게 하고 싶다, 하는 다짐을 적어두세요.</p>
      <textarea
        rows={2}
        placeholder="예: 먼저 연락하는 사람이 되고 싶다"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
      <button type="button" onClick={submit} disabled={!draft.trim()} style={{ ...smallAddBtnStyle, alignSelf: "flex-start" }}>
        다짐 추가
      </button>

      {intentions.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 적어둔 다짐이 없어요.</p>
      ) : (
        intentions.map((i) => (
          <div key={i.id} style={rowStyle}>
            <p style={{ margin: 0, fontSize: 14 }}>{i.text}</p>
            <button type="button" onClick={() => onDelete(i.id)} style={deleteLinkStyle}>
              삭제
            </button>
          </div>
        ))
      )}
    </section>
  );
}

export function PersonCard({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const { vault, update } = useSession();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [giftDraft, setGiftDraft] = useState("");
  const [giftError, setGiftError] = useState<string | null>(null);
  const [prevContactAt, setPrevContactAt] = useState<number | undefined | null>(null);
  const person = vault ? findPerson(vault, id) : undefined;

  if (!person) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <p style={{ color: "var(--muted)" }}>이 사람은 이미 지워졌어요.</p>
      </main>
    );
  }

  const addDraftNote = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    update((v) => addNote(v, id, text));
    setDraft("");
  };

  const addDraftGift = () => {
    const text = giftDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setGiftError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setGiftError(null);
    update((v) => addGift(v, id, text));
    setGiftDraft("");
  };

  const removePerson = () => {
    if (!confirm(`${person.name} 기록을 전부 지울까요? 되돌릴 수 없어요.`)) return;
    update((v) => deletePerson(v, id));
    onBack();
  };

  const temp = relationshipTemp(person);
  const wisdom = pickWisdomForPerson(person);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <button type="button" onClick={() => onEdit(id)} style={{ ...linkStyle, color: "var(--accent)" }}>
          수정
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: TEMP_COLOR[temp],
            color: "var(--accent-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {person.name.slice(0, 1)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, margin: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ wordBreak: "break-word" }}>{person.name}</span>
            {person.mbti && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", background: "var(--field)", borderRadius: 999, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                {person.mbti}
              </span>
            )}
            {person.gender && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg2)", background: "var(--field)", borderRadius: 999, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                {person.gender}
              </span>
            )}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            {person.birthday && `생일 ${person.birthdayYear ? `${person.birthdayYear}-` : ""}${person.birthday}`}
            {person.birthday && person.tags.length > 0 && " · "}
            {person.tags.join(" · ")}
          </p>
          {(person.groups ?? []).length > 0 && (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0" }}>👥 {(person.groups ?? []).join(" · ")}</p>
          )}
          <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0" }}>
            {RELATIONSHIP_TEMP_LABEL[temp]}
            {person.lastContactAt && ` · ${formatDate(person.lastContactAt)}`}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            setPrevContactAt(person.lastContactAt ?? undefined);
            update((v) => touchLastContact(v, id));
          }}
          style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--field)", fontSize: 12.5 }}
        >
          오늘 연락했어요
        </button>
        {prevContactAt !== null && (
          <button
            type="button"
            onClick={() => {
              update((v) => setLastContact(v, id, prevContactAt));
              setPrevContactAt(null);
            }}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5 }}
          >
            취소
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 14, borderRadius: 16, background: "var(--accent)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>{person.name}에게 어울리는 말</span>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--accent-fg)" }}>{wisdom.text}</p>
      </div>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>기록</h2>
        <textarea
          rows={2}
          placeholder="새로 들은 걸 적어두세요 (예: 커피는 아이스 아메리카노만 마심)"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
        <button type="button" onClick={addDraftNote} disabled={!draft.trim()} style={{ ...smallAddBtnStyle, alignSelf: "flex-start" }}>
          기록 추가
        </button>

        {person.notes.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 적어둔 게 없어요.</p>
        ) : (
          [...person.notes]
            .sort((a, b) => b.at - a.at)
            .map((n) => (
              <div key={n.id} style={rowStyle}>
                <p style={{ margin: 0, fontSize: 14 }}>{n.text}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(n.at)}</span>
                  <button type="button" onClick={() => update((v) => deleteNote(v, id, n.id))} style={deleteLinkStyle}>
                    삭제
                  </button>
                </div>
              </div>
            ))
        )}
      </section>

      <section style={sectionStyle}>
        <ChipListField
          label="좋아하는 것"
          placeholder="예: 커피, 고양이"
          items={person.likes ?? []}
          onAdd={(text) => update((v) => addLike(v, id, text))}
          onRemove={(index) => update((v) => removeLike(v, id, index))}
        />
      </section>

      <section style={sectionStyle}>
        <ChipListField
          label="싫어하는 것"
          placeholder="예: 민트초코, 담배 냄새"
          items={person.dislikes ?? []}
          onAdd={(text) => update((v) => addDislike(v, id, text))}
          onRemove={(index) => update((v) => removeDislike(v, id, index))}
        />
      </section>

      <section style={sectionStyle}>
        <ChipListField
          label="받은 은혜"
          placeholder="예: 이사할 때 도와줌"
          items={person.favors ?? []}
          onAdd={(text) => update((v) => addFavor(v, id, text))}
          onRemove={(index) => update((v) => removeFavor(v, id, index))}
        />
      </section>

      <AnniversarySection
        person={person}
        onAdd={(label, date) => update((v) => addAnniversary(v, id, label, date))}
        onDelete={(annId) => update((v) => deleteAnniversary(v, id, annId))}
      />

      <section style={sectionStyle}>
        <h2 style={headingStyle}>받은 선물</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="예: 생일 선물로 향수"
            value={giftDraft}
            onChange={(e) => {
              setGiftDraft(e.target.value);
              setGiftError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addDraftGift()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={addDraftGift} disabled={!giftDraft.trim()} style={smallAddBtnStyle}>
            추가
          </button>
        </div>
        {giftError && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{giftError}</p>}

        {(person.gifts ?? []).length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 받은 선물이 없어요.</p>
        ) : (
          [...(person.gifts ?? [])]
            .sort((a, b) => b.at - a.at)
            .map((g) => (
              <div key={g.id} style={{ padding: "10px 12px", borderRadius: "var(--radius)", background: "var(--field)", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => update((v) => toggleGiftRepaid(v, id, g.id))}
                    aria-pressed={g.repaid}
                    aria-label={g.repaid ? "갚음 표시 해제" : "갚음으로 표시"}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: g.repaid ? "var(--ok)" : "var(--card)",
                      color: "#fff",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {g.repaid ? "✓" : ""}
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, textDecoration: g.repaid ? "line-through" : "none", color: g.repaid ? "var(--muted)" : "var(--fg)" }}>{g.text}</p>
                    <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{g.repaid ? `${formatDate(g.repaidAt ?? g.at)} 갚음` : `${formatDate(g.at)} 받음`}</span>
                  </div>
                  <button type="button" onClick={() => update((v) => deleteGift(v, id, g.id))} style={deleteLinkStyle}>
                    삭제
                  </button>
                </div>
                <input
                  placeholder="뭘로(어떻게) 갚을지/갚았는지 적어두세요"
                  defaultValue={g.repaidWith ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (g.repaidWith ?? "")) {
                      update((v) => setGiftRepaidWith(v, id, g.id, e.target.value));
                    }
                  }}
                  style={{ ...inputStyle, padding: "8px 10px" }}
                />
              </div>
            ))
        )}
      </section>

      <IntentionSection
        person={person}
        onAdd={(text) => update((v) => addIntention(v, id, text))}
        onDelete={(intentionId) => update((v) => deleteIntention(v, id, intentionId))}
      />

      <button type="button" onClick={removePerson} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", marginTop: 6 }}>
        이 사람 전체 삭제
      </button>
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const deleteLinkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: 11.5, flexShrink: 0 };
const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const headingStyle: React.CSSProperties = { fontSize: 14, margin: 0, color: "var(--fg2)" };
// 16px 미만이면 iOS Safari가 포커스 시 자동으로 확대해버려서(그리고 잘 안 풀림) 16으로 고정.
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg)", fontSize: 16 };
const smallAddBtnStyle: React.CSSProperties = { padding: "0 14px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 };
const chipStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--fg2)", background: "var(--field)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px" };
const rowStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", background: "var(--field)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
