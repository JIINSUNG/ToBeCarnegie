import { useState } from "react";
import { useSession } from "../session";
import {
  addGoal,
  removeGoal,
  toggleGoalDone,
  type GoalField,
} from "../lib/goals";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import {
  headingStyle,
  linkStyle,
  primaryBtnStyle,
  sectionStyle,
  stickyHeaderStyle,
} from "../lib/layout";
import type { Goal } from "../types";
import { PeriodGoals } from "../components/PeriodGoals";
import { Stories } from "../components/Stories";

function GoalSection({
  field,
  title,
  hint,
  placeholder,
  goals,
}: {
  field: GoalField;
  title: string;
  hint: string;
  placeholder: string;
  goals: Goal[];
}) {
  const { update } = useSession();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const reason = checkSensitive(text);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setError(null);
    update((v) => addGoal(v, field, text));
    setDraft("");
  };

  const doneCount = goals.filter((g) => g.done).length;
  // 안 한 것부터, 각 그룹 안에서는 최근에 추가한 순서로.
  const sorted = [...goals].sort(
    (a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt,
  );

  return (
    <section style={sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={headingStyle}>{title}</h2>
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
          {doneCount} / {goals.length}
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>{hint}</p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          style={primaryBtnStyle}
        >
          추가
        </button>
      </div>
      {error && (
        <p style={{ color: "var(--warn)", fontSize: 12.5, margin: 0 }}>
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>
          아직 적어둔 게 없어요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onToggle={() => update((v) => toggleGoalDone(v, field, g.id))}
              onRemove={() => update((v) => removeGoal(v, field, g.id))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GoalRow({
  goal,
  onToggle,
  onRemove,
}: {
  goal: Goal;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div style={rowStyle}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={goal.done}
        aria-label={(goal.done ? "달성 취소: " : "달성 표시: ") + goal.text}
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          border: "1px solid var(--line)",
          background: goal.done ? "var(--ok)" : "var(--card)",
          color: "#fff",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {goal.done ? "✓" : ""}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 14,
            textDecoration: goal.done ? "line-through" : "none",
            color: goal.done ? "var(--muted)" : "var(--fg)",
          }}
        >
          {goal.text}
        </span>
        {goal.done && goal.achievedAt && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            {formatDate(goal.achievedAt)} 달성
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${goal.text} 삭제`}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontSize: 11.5,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        삭제
      </button>
    </div>
  );
}

type GoalsTab = "period" | "stories" | "list";
const TAB_KEY = "relnote-goals-tab";

export function Goals({ onBack }: { onBack: () => void }) {
  const { vault } = useSession();
  const [tab, setTabRaw] = useState<GoalsTab>(() => {
    try {
      const t = sessionStorage.getItem(TAB_KEY);
      return t === "stories" || t === "list" ? t : "period";
    } catch {
      return "period";
    }
  });
  const setTab = (t: GoalsTab) => {
    setTabRaw(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* 무시 */
    }
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingTop: 16,
      }}
    >
      <div
        style={{
          ...stickyHeaderStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>목표</h1>
        <span style={{ width: 40 }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
        }}
        role="tablist"
        aria-label="목표 화면"
      >
        {(
          [
            ["period", "📅 기간 목표"],
            ["stories", "🌱 영향·영감"],
            ["list", "🏆 체크리스트"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            style={{
              padding: "9px 4px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              fontSize: 13,
              fontWeight: 600,
              background: tab === k ? "var(--accent)" : "var(--card)",
              color: tab === k ? "var(--accent-fg)" : "var(--fg2)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "period" && <PeriodGoals />}
      {tab === "stories" && <Stories />}

      {tab === "list" && (
        <>
          <GoalSection
            field="goals"
            title="🏆 목표"
            hint="이루고 싶은 걸 생각나는 대로 적어보세요. 몇 개든 괜찮아요 — 하나씩 체크하는 재미로."
            placeholder="예: 1년 안에 5kg 감량하기"
            goals={vault?.goals ?? []}
          />

          <GoalSection
            field="improvements"
            title="🔧 고치고 싶은 점"
            hint="스스로 돌아보면서, 그만하고 싶은 것·고치고 싶은 습관을 적어두세요."
            placeholder="예: 약속 시간에 늦지 않기"
            goals={vault?.improvements ?? []}
          />
        </>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--field)",
  fontSize: 16,
  color: "var(--fg)",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: "var(--radius)",
  background: "var(--field)",
};
