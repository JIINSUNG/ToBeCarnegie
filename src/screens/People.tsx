import { useState } from "react";
import { useSession } from "../session";
import { addGroupName, allGroups, deleteGroup, renameGroup, searchPeople } from "../lib/people";
import { relationshipTemp, upcomingBirthdays, type RelationshipTemp } from "../lib/derive";
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

function statusLine(person: Person): string {
  if (!person.lastContactAt) return "아직 연락 기록 없음";
  const temp = relationshipTemp(person);
  const label = temp === "warm" ? "최근 연락함" : temp === "normal" ? "연락함" : "연락 뜸해짐";
  return `${label} · ${formatDate(person.lastContactAt)}`;
}

export function People({
  onOpen,
  onAdd,
  onBack,
  initialGroupedView = false,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
  onBack: () => void;
  initialGroupedView?: boolean;
}) {
  const { vault, update } = useSession();
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [groupedView, setGroupedView] = useState(initialGroupedView);
  const [managingGroups, setManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const searched = vault ? searchPeople(vault, q) : [];
  const list = groupFilter ? searched.filter((p) => (p.groups ?? []).includes(groupFilter)) : searched;
  const birthdaySoon = new Map((vault ? upcomingBirthdays(vault) : []).map((b) => [b.person.id, b.daysUntil]));
  const groups = vault ? allGroups(vault) : [];

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    update((v) => addGroupName(v, name));
    setNewGroupName("");
  };

  const startRename = (g: string) => {
    setRenamingGroup(g);
    setRenameDraft(g);
  };

  const confirmRename = () => {
    if (!renamingGroup) return;
    const name = renameDraft.trim();
    if (name && name !== renamingGroup) {
      update((v) => renameGroup(v, renamingGroup, name));
      if (groupFilter === renamingGroup) setGroupFilter(name);
    }
    setRenamingGroup(null);
  };

  const handleDeleteGroup = (g: string) => {
    if (!confirm(`"${g}" 그룹을 지울까요? 이 그룹에 속한 사람들은 그대로 남고, 그룹 태그만 빠져요.`)) return;
    update((v) => deleteGroup(v, g));
    if (groupFilter === g) setGroupFilter(null);
  };

  const renderPersonRow = (p: Person) => {
    const temp = relationshipTemp(p);
    const daysUntilBirthday = birthdaySoon.get(p.id);
    const pendingGifts = (p.gifts ?? []).filter((g) => !g.repaid).length;

    return (
      <button
        key={p.id}
        type="button"
        onClick={() => onOpen(p.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 16,
          border: "1px solid var(--line)",
          background: "var(--card)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: TEMP_COLOR[temp],
            color: "var(--accent-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {p.name.slice(0, 1)}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <b style={{ fontSize: 16 }}>{p.name}</b>
            {daysUntilBirthday !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--field)", borderRadius: 999, padding: "2px 7px" }}>
                🎂 {daysUntilBirthday === 0 ? "오늘" : `D-${daysUntilBirthday}`}
              </span>
            )}
            {pendingGifts > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warn)", background: "var(--field)", borderRadius: 999, padding: "2px 7px" }}>
                🎁 갚을 선물 {pendingGifts}
              </span>
            )}
          </div>

          {p.tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {p.tags.map((t) => (
                <span key={t} style={{ fontSize: 11.5, color: "var(--fg2)", background: "var(--field)", borderRadius: 999, padding: "2px 8px" }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{statusLine(p)}</span>
        </div>
      </button>
    );
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>사람 목록</h1>
        <button type="button" onClick={onAdd} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          + 추가
        </button>
      </div>

      <input
        placeholder="이름·태그·기록·선물·좋아요 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 16 }}
      />

      <div style={{ display: "flex", gap: 14 }}>
        <button type="button" onClick={() => setGroupedView((v) => !v)} style={{ ...linkStyle, padding: 0, fontSize: 12.5 }}>
          {groupedView ? "목록으로 보기" : "그룹별로 보기"}
        </button>
        <button type="button" onClick={() => setManagingGroups((v) => !v)} style={{ ...linkStyle, padding: 0, fontSize: 12.5 }}>
          {managingGroups ? "그룹 관리 닫기" : "그룹 관리"}
        </button>
      </div>

      {managingGroups && (
        <div style={groupPanelStyle}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="새 그룹 이름"
              style={{ flex: 1, padding: "9px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16 }}
            />
            <button type="button" onClick={handleAddGroup} disabled={!newGroupName.trim()} style={smallPriBtnStyle}>
              추가
            </button>
          </div>
          {groups.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>아직 그룹이 없어요.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groups.map((g) => (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {renamingGroup === g ? (
                    <>
                      <input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        autoFocus
                        style={{ flex: 1, padding: "7px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16 }}
                      />
                      <button type="button" onClick={confirmRename} style={{ ...linkStyle, color: "var(--accent)", padding: 0, fontSize: 12.5 }}>
                        저장
                      </button>
                      <button type="button" onClick={() => setRenamingGroup(null)} style={{ ...linkStyle, padding: 0, fontSize: 12.5 }}>
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13.5 }}>👥 {g}</span>
                      <button type="button" onClick={() => startRename(g)} style={{ ...linkStyle, padding: 0, fontSize: 12.5 }}>
                        이름 바꾸기
                      </button>
                      <button type="button" onClick={() => handleDeleteGroup(g)} style={{ ...linkStyle, color: "var(--warn)", padding: 0, fontSize: 12.5 }}>
                        삭제
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!groupedView && groups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
              aria-pressed={groupFilter === g}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: groupFilter === g ? "var(--accent)" : "var(--card)",
                color: groupFilter === g ? "var(--accent-fg)" : "var(--fg2)",
              }}
            >
              👥 {g}
            </button>
          ))}
        </div>
      )}

      {groupedView ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map((g) => {
            const members = searched.filter((p) => (p.groups ?? []).includes(g));
            return (
              <div key={g} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 style={groupHeadingStyle}>
                  👥 {g} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {members.length}명</span>
                </h2>
                {members.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>아직 아무도 없어요.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{members.map(renderPersonRow)}</div>
                )}
              </div>
            );
          })}
          {(() => {
            const ungrouped = searched.filter((p) => (p.groups ?? []).length === 0);
            if (!ungrouped.length) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 style={groupHeadingStyle}>그룹 없음</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{ungrouped.map(renderPersonRow)}</div>
              </div>
            );
          })()}
          {groups.length === 0 && searched.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>아직 적어둔 사람이 없어요.</p>
          )}
        </div>
      ) : (
        <>
          {list.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
              {groupFilter ? "이 그룹엔 아직 사람이 없어요." : q ? "찾는 사람이 없어요." : "아직 적어둔 사람이 없어요."}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{list.map(renderPersonRow)}</div>
        </>
      )}
    </main>
  );
}

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
const groupHeadingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const groupPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
};
const smallPriBtnStyle: React.CSSProperties = {
  padding: "0 16px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 13.5,
  fontWeight: 600,
};
