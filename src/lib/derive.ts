// Vault에서 파생되는 값들: 다가오는 생일·기념일, 관계 온도, 연락 뜸한 사람, 브리핑, 백업 알림.
// 전부 순수 함수 — 현재 시각(now)을 인자로 받아 테스트 가능하게 한다.
import type { Anniversary, Person, Vault } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 로컬 기준 "YYYY-MM-DD" — 오늘의 다짐이 자정 넘어가면 사라지게 하는 기준으로 쓴다. */
export function todayDateStr(now: number = Date.now()): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export interface UpcomingBirthday {
  person: Person;
  daysUntil: number;
}

/** (월, 일)이 매년 돌아올 때, 오늘(now) 기준 다음 occurrence 날짜와 며칠 남았는지. */
function nextOccurrence(month: number, day: number, now: number): { date: Date; daysUntil: number } {
  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < todayStart.getTime()) {
    next = new Date(today.getFullYear() + 1, month - 1, day);
  }
  return { date: next, daysUntil: Math.round((next.getTime() - todayStart.getTime()) / DAY_MS) };
}

/** 오늘(now) 기준 withinDays일 안에 생일인 사람들을, 가까운 순서로. */
export function upcomingBirthdays(vault: Vault, now: number = Date.now(), withinDays = 14): UpcomingBirthday[] {
  const result: UpcomingBirthday[] = [];
  for (const person of vault.people) {
    if (!person.birthday) continue;
    const [month, day] = person.birthday.split("-").map(Number);
    const { daysUntil } = nextOccurrence(month, day, now);
    if (daysUntil <= withinDays) result.push({ person, daysUntil });
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

export interface UpcomingAnniversary {
  person: Person;
  anniversary: Anniversary;
  daysUntil: number;
  /** 처음 기록한 해로부터 몇 년째인지. */
  years: number;
}

/** 오늘(now) 기준 withinDays일 안에 돌아오는 기념일들을, 가까운 순서로. 매년 반복된다고 본다. */
export function upcomingAnniversaries(vault: Vault, now: number = Date.now(), withinDays = 14): UpcomingAnniversary[] {
  const result: UpcomingAnniversary[] = [];
  for (const person of vault.people) {
    for (const anniversary of person.anniversaries ?? []) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anniversary.date);
      if (!m) continue;
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      const { date, daysUntil } = nextOccurrence(month, day, now);
      if (daysUntil > withinDays) continue;
      result.push({ person, anniversary, daysUntil, years: Math.max(0, date.getFullYear() - year) });
    }
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

export type RelationshipTemp = "warm" | "normal" | "cooling" | "unknown";

export const RELATIONSHIP_TEMP_LABEL: Record<RelationshipTemp, string> = {
  warm: "따뜻해요",
  normal: "보통이에요",
  cooling: "연락이 뜸해졌어요",
  unknown: "아직 연락 기록이 없어요",
};

/** 마지막 연락 이후 지난 시간으로 관계 온도를 매긴다. */
export function relationshipTemp(person: Person, now: number = Date.now()): RelationshipTemp {
  if (!person.lastContactAt) return "unknown";
  const daysSince = (now - person.lastContactAt) / DAY_MS;
  if (daysSince <= 14) return "warm";
  if (daysSince <= 60) return "normal";
  return "cooling";
}

export interface StaleContact {
  person: Person;
  daysSinceContact: number;
}

/** 연락(또는 등록)한 지 thresholdDays 이상 지난 사람들을, 오래된 순서로. 사람마다
 * contactFrequencyDays를 따로 정해뒀으면(예: "이 사람은 3달에 한 번") 그 값을 기본값 대신 쓴다. */
export function staleContacts(vault: Vault, now: number = Date.now(), thresholdDays = 60): StaleContact[] {
  const result: StaleContact[] = [];
  for (const person of vault.people) {
    const lastTouch = person.lastContactAt ?? person.createdAt;
    const daysSinceContact = Math.floor((now - lastTouch) / DAY_MS);
    const threshold = person.contactFrequencyDays ?? thresholdDays;
    if (daysSinceContact >= threshold) {
      result.push({ person, daysSinceContact });
    }
  }
  return result.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}

/** 사람이 있는데 thresholdDays 넘게(또는 한 번도) 백업한 적 없으면 알려준다. */
export function shouldRemindBackup(vault: Vault, now: number = Date.now(), thresholdDays = 14): boolean {
  if (vault.people.length === 0) return false;
  if (!vault.lastBackupAt) return true;
  return (now - vault.lastBackupAt) / DAY_MS >= thresholdDays;
}

export interface ContactSuggestion {
  person: Person;
  reason: string;
}

/** 오늘 연락하면 좋을 사람 딱 한 명 — 생일인 사람이 있으면 그 사람, 없으면 가장 연락이 뜸한
 * 사람(사람마다 정해둔 연락 주기가 있으면 그 기준). 둘 다 없으면 null. */
export function suggestContact(vault: Vault, now: number = Date.now()): ContactSuggestion | null {
  const todayBirthday = upcomingBirthdays(vault, now, 0);
  if (todayBirthday.length > 0) {
    return { person: todayBirthday[0].person, reason: "오늘 생일이에요" };
  }
  const stale = staleContacts(vault, now);
  if (stale.length > 0) {
    return { person: stale[0].person, reason: `연락한 지 ${stale[0].daysSinceContact}일 됐어요` };
  }
  return null;
}

export type ActivityKind = "note" | "gift" | "anniversary" | "intention";

export interface ActivityItem {
  person: Person;
  at: number;
  kind: ActivityKind;
  text: string;
}

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  note: "기록",
  gift: "선물·경조사",
  anniversary: "기념일 추가",
  intention: "다짐",
};

/** 모든 사람에 걸쳐 최근에 적어둔 것들을 시간순으로 모아, "요즘 내가 뭘 기록했더라"를 한눈에
 * 보여준다. 기념일은 실제 날짜가 아니라 "언제 등록했는지"(updatedAt) 기준으로 줄 세운다. */
export function recentActivity(vault: Vault, limit = 20): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const person of vault.people) {
    for (const n of person.notes) items.push({ person, at: n.at, kind: "note", text: n.text });
    for (const g of person.gifts ?? []) items.push({ person, at: g.at, kind: "gift", text: g.text });
    for (const a of person.anniversaries ?? []) items.push({ person, at: a.updatedAt, kind: "anniversary", text: a.label });
    for (const i of person.intentions ?? []) items.push({ person, at: i.at, kind: "intention", text: i.text });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

export interface Briefing {
  upcomingBirthdays: UpcomingBirthday[];
  upcomingAnniversaries: UpcomingAnniversary[];
  staleContacts: StaleContact[];
  shouldBackup: boolean;
  recentActivity: ActivityItem[];
}

export function buildBriefing(vault: Vault, now: number = Date.now()): Briefing {
  return {
    upcomingBirthdays: upcomingBirthdays(vault, now),
    upcomingAnniversaries: upcomingAnniversaries(vault, now),
    staleContacts: staleContacts(vault, now),
    shouldBackup: shouldRemindBackup(vault, now),
    recentActivity: recentActivity(vault),
  };
}
