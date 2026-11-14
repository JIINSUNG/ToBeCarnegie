// 영향·영감 노트 — 내가 누군가에게 준 좋은 영향, 누군가(사람·책·영상)에게 받은 영감을 모아둔다.
// 사람 목록에 있는 사람을 고르면 그 사람 카드에서도 보인다(personId를 넘기면 그 사람 것만).
import { useState } from "react";
import { useSession } from "../session";
import { addStory, deleteStory, editStory, storiesFor, type StoryInput } from "../lib/period-goals";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { todayDateStr } from "../lib/derive";
import { headingStyle, primaryBtnStyle, sectionStyle } from "../lib/layout";
import type { InfluenceStory } from "../types";

const KIND: Record<InfluenceStory["kind"], { icon: string; label: string; hint: string; ph: string }> = {
  gave: { icon: "🌱", label: "내가 준 좋은 영향", hint: "누군가에게 도움이 됐던 일", ph: "예: 신입 후배 첫 보고서 같이 봐줌 — 고맙다고 커피 사줌" },
  received: { icon: "✨", label: "내가 받은 영감", hint: "닮고 싶었던 말·행동", ph: "예: 팀장님이 실수한 사람을 먼저 감싸주는 걸 봄" },
};

function dayToTs(date: string): number {
  if (date === todayDateStr()) return Date.now();
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export function Stories({ personId, compact }: { personId?: string; compact?: boolean }) {
  const { vault, update } = useSession();
  const [kind, setKind] = useState<InfluenceStory["kind"] | "all">("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<InfluenceStory["kind"] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  if (!vault) return null;

  const list = storiesFor(vault, { kind: kind === "all" ? undefined : kind, personId, q });
  const all = storiesFor(vault, { personId });
  const counts = { gave: all.filter((s) => s.kind === "gave").length, received: all.filter((s) => s.kind === "received").length };
  if (compact && all.length === 0 && !adding) {
    return (
      <section style={sectionStyle}>
        <h2 style={{ ...headingStyle, fontSize: 14, color: "var(--fg2)" }}>🌱 영향·영감</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {(["received", "gave"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setAdding(k)} style={{ ...chipStyle, flex: 1 }}>
              + {KIND[k].icon} {k === "received" ? "이 사람에게 받은 영감" : "이 사람에게 준 도움"}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={compact ? { ...headingStyle, fontSize: 14, color: "var(--fg2)" } : headingStyle}>🌱 영향·영감 노트</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          🌱 {counts.gave} · ✨ {counts.received}
        </span>
      </div>
      {!compact && <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>좋은 영향을 준 순간과 영감을 받은 순간을 모아두면, 어떤 사람이 되고 싶은지가 보여요.</p>}

      {adding ? (
        <StoryForm
          initial={{ kind: adding, text: "", personId }}
          lockPerson={!!personId}
          onSave={(input, date) => {
            update((v) => addStory(v, input, dayToTs(date)));
            setAdding(null);
          }}
          onCancel={() => setAdding(null)}
        />
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {(["gave", "received"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setAdding(k)} style={{ ...chipStyle, flex: 1 }}>
              + {KIND[k].icon} {k === "gave" ? "준 영향" : "받은 영감"}
            </button>
          ))}
        </div>
      )}

      {!compact && all.length > 0 && (
        <>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 내용·사람·배운 점 검색" aria-label="영향·영감 검색" style={inputStyle} />
          <div style={{ display: "flex", gap: 6 }} role="group" aria-label="종류">
            {(["all", "gave", "received"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} style={{ ...chipStyle, background: kind === k ? "var(--accent)" : "var(--field)", color: kind === k ? "var(--accent-fg)" : "var(--fg2)" }}>
                {k === "all" ? "전체" : `${KIND[k].icon} ${k === "gave" ? "준 영향" : "받은 영감"}`}
              </button>
            ))}
          </div>
        </>
      )}

      {list.length === 0 && all.length > 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>맞는 기록이 없어요.</p>}
      {list.map((s) =>
        editId === s.id ? (
          <StoryForm
            key={s.id}
            initial={s}
            initialDate={todayDateStr(s.at)}
            lockPerson={!!personId}
            onSave={(input) => {
              update((v) => editStory(v, s.id, input));
              setEditId(null);
            }}
            onCancel={() => setEditId(null)}
            onRemove={() => {
              if (!confirm("이 기록을 지울까요?")) return;
              update((v) => deleteStory(v, s.id));
              setEditId(null);
            }}
          />
        ) : (
          <button key={s.id} type="button" onClick={() => setEditId(s.id)} style={{ textAlign: "left", background: "var(--field)", border: "none", borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, color: "var(--fg)" }}>
            <span style={{ fontSize: 11.5, color: s.kind === "gave" ? "var(--ok)" : "var(--accent)", fontWeight: 600 }}>
              {KIND[s.kind].icon} {KIND[s.kind].label}
              {(s.personId || s.who) && !personId && (
                <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {s.personId ? vault.people.find((p) => p.id === s.personId)?.name ?? s.who ?? "" : s.who}</span>
              )}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {formatDate(s.at)}</span>
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.text}</span>
            {s.lesson && <span style={{ fontSize: 12.5, color: "var(--fg2)" }}>💡 {s.lesson}</span>}
          </button>
        )
      )}
    </section>
  );
}

function StoryForm({
  initial,
  initialDate,
  lockPerson,
  onSave,
  onCancel,
  onRemove,
}: {
  initial: StoryInput;
  initialDate?: string;
  lockPerson?: boolean;
  onSave: (input: StoryInput, date: string) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const { vault } = useSession();
  const [kind, setKind] = useState(initial.kind);
  const [text, setText] = useState(initial.text);
  const [personId, setPersonId] = useState(initial.personId ?? "");
  const [who, setWho] = useState(initial.who ?? "");
  const [lesson, setLesson] = useState(initial.lesson ?? "");
  const [date, setDate] = useState(initialDate ?? todayDateStr());
  const [error, setError] = useState<string | null>(null);
  const people = [...(vault?.people ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const save = () => {
    if (!text.trim()) return;
    for (const t of [text, who, lesson]) {
      const r = checkSensitive(t);
      if (r) return setError(BLOCK_REASON_LABEL[r]);
    }
    onSave({ kind, text, personId: personId || undefined, who: personId ? undefined : who, lesson }, date);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--accent)", borderRadius: 12, padding: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(["gave", "received"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} style={{ ...chipStyle, flex: 1, background: kind === k ? "var(--accent)" : "var(--field)", color: kind === k ? "var(--accent-fg)" : "var(--fg2)" }}>
            {KIND[k].icon} {KIND[k].label}
          </button>
        ))}
      </div>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={KIND[kind].ph} aria-label="있었던 일" style={{ ...inputStyle, resize: "vertical" }} autoFocus />
      {!lockPerson && (
        <div style={{ display: "flex", gap: 6 }}>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="누구와" style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
            <option value="">{kind === "gave" ? "누구에게? (목록에서)" : "누구에게서? (목록에서)"}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!personId && <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="또는 직접 (책·영상도)" aria-label="누구(직접 입력)" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />}
        </div>
      )}
      <input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder={kind === "gave" ? "느낀 점 (선택)" : "배운 점·나도 해볼 것 (선택)"} aria-label="배운 점" style={inputStyle} />
      <input type="date" value={date} max={todayDateStr()} onChange={(e) => setDate(e.target.value || todayDateStr())} aria-label="언제" style={inputStyle} disabled={!!initialDate} />
      {error && <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {onRemove && (
          <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5 }}>
            삭제
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onCancel} style={{ ...primaryBtnStyle, background: "var(--field)", color: "var(--fg2)" }}>
          취소
        </button>
        <button type="button" onClick={save} disabled={!text.trim()} style={primaryBtnStyle}>
          저장
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const chipStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--field)", color: "var(--fg2)", fontSize: 12.5, fontWeight: 600 };
