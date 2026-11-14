// 성장 탭의 "미션 달성 기록" — 최근 5주를 월요일 시작 달력 칸으로 보여주고, 칸 색 진하기로 그날 달성 비율을 나타낸다.
import { useState } from "react";
import { missionHistory, missionRate, type MissionDay } from "../lib/missions";
import { shiftDateStr } from "../lib/streak";
import type { Vault } from "../types";

const WEEKS = 5;
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

function mondayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

function cellColor(day: MissionDay): string {
  if (!day.total) return "var(--field)";
  const ratio = day.done / day.total;
  if (ratio === 0) return "var(--field)";
  if (ratio >= 1) return "var(--ok)";
  // 일부만 했으면 달성 비율만큼 연하게.
  return `color-mix(in srgb, var(--ok) ${Math.round(25 + ratio * 50)}%, var(--field))`;
}

function pct(rate: number | null): string {
  return rate == null ? "–" : `${Math.round(rate * 100)}%`;
}

export function MissionCalendar({ vault, today }: { vault: Vault; today: string }) {
  const [picked, setPicked] = useState<MissionDay | null>(null);
  const weekEnd = shiftDateStr(today, 6 - mondayIndex(today));
  const days = missionHistory(vault, weekEnd, WEEKS * 7);
  const past = days.filter((d) => d.date <= today);
  const last7 = past.slice(-7);
  const prev7 = past.slice(-14, -7);
  const rate7 = missionRate(last7);
  const ratePrev = missionRate(prev7);
  const perfectDays = past.filter((d) => d.total > 0 && d.done >= d.total).length;
  const diff = rate7 != null && ratePrev != null ? Math.round((rate7 - ratePrev) * 100) : null;

  if (!(vault.missions ?? []).length) return null;

  return (
    <section style={sectionStyle}>
      <h2 style={{ fontSize: 15, margin: 0 }}>📅 미션 달성 기록</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <Stat label="최근 7일 달성률" value={pct(rate7)} sub={diff == null ? undefined : `지난주보다 ${diff >= 0 ? "+" : ""}${diff}%p`} />
        <Stat label="5주간 달성률" value={pct(missionRate(past))} />
        <Stat label="다 해낸 날" value={`${perfectDays}일`} />
      </div>

      <div role="grid" aria-label="최근 5주 미션 달성 달력" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={{ textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
            {w}
          </span>
        ))}
        {days.map((d) => {
          const future = d.date > today;
          const isToday = d.date === today;
          const label = `${d.date.slice(5).replace("-", "/")} ${d.total ? `${d.done}/${d.total} 달성` : "미션 없음"}`;
          return (
            <button
              key={d.date}
              type="button"
              disabled={future}
              onClick={() => setPicked(d)}
              aria-label={future ? `${d.date} (아직 안 옴)` : label}
              style={{
                aspectRatio: "1",
                borderRadius: 8,
                border: isToday ? "2px solid var(--accent)" : "1px solid var(--line)",
                background: future ? "transparent" : cellColor(d),
                opacity: future ? 0.35 : 1,
                fontSize: 11,
                fontWeight: isToday ? 700 : 500,
                color: !future && d.total && d.done >= d.total ? "#fff" : "var(--fg2)",
                padding: 0,
              }}
            >
              {Number(d.date.slice(8))}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--muted)" }}>
        <span>{picked ? `${picked.date.replaceAll("-", ".")} · ${picked.total ? `${picked.done} / ${picked.total} 달성` : "그날은 미션이 없었어요"}` : "칸을 누르면 그날 기록을 보여드려요."}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          덜함
          {[{ total: 1, done: 0 }, { total: 2, done: 1 }, { total: 1, done: 1 }].map((d, i) => (
            <i key={i} style={{ width: 10, height: 10, borderRadius: 3, background: cellColor({ date: "", ...d }), border: "1px solid var(--line)" }} />
          ))}
          다함
        </span>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 8px", borderRadius: 12, background: "var(--field)", textAlign: "center" }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
      <b style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{value}</b>
      {sub && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 14,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
};
