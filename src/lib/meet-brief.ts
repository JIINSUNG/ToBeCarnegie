// "만나기 전 30초 브리핑" — 그 사람에 대해 적어둔 것 중 약속 직전에 꼭 떠올려야 할 것만 한 화면용으로 모은다.
// 새로 저장하는 건 없고, 이미 있는 기록을 고르고 정렬만 한다(순수 함수).
import { upcomingAnniversaries, upcomingBirthdays, relationshipTemp, type RelationshipTemp } from "./derive";
import { contactTimeline, openFollowUps } from "./contacts";
import { appreciationsFor } from "./appreciations";
import { storiesFor } from "./period-goals";
import type { Appreciation, ContactLog, FollowUp, Gift, InfluenceStory, Note, Person, Vault } from "../types";

export interface MeetBrief {
  person: Person;
  temp: RelationshipTemp;
  lastContact?: ContactLog;
  /** 기록은 없지만 lastContactAt만 있는 옛 데이터. */
  lastContactAt?: number;
  followUps: FollowUp[];
  avoidTopics: string[];
  likes: string[];
  dislikes: string[];
  recentNotes: Note[];
  /** 다가오는 날(생일·기념일) — 45일 안. */
  upcoming: { label: string; daysUntil: number }[];
  /** 받고 아직 답례 안 한 선물. */
  unrepaidGifts: Gift[];
  intentions: string[];
  lastAppreciation?: Appreciation;
  inspiration?: InfluenceStory;
  /** 보여줄 게 하나도 없는지(새로 등록한 사람 등). */
  empty: boolean;
}

export function buildMeetBrief(vault: Vault, personId: string, now: number = Date.now()): MeetBrief | null {
  const person = vault.people.find((p) => p.id === personId);
  if (!person) return null;
  const only: Vault = { ...vault, people: [person] };
  const upcoming = [
    ...upcomingBirthdays(only, now, 45).map((b) => ({ label: "생일", daysUntil: b.daysUntil })),
    ...upcomingAnniversaries(only, now, 45).map((a) => ({ label: a.anniversary.label, daysUntil: a.daysUntil })),
  ].sort((a, b) => a.daysUntil - b.daysUntil);
  const lastContact = contactTimeline(person)[0];
  const brief: MeetBrief = {
    person,
    temp: relationshipTemp(person, now),
    lastContact,
    lastContactAt: lastContact ? undefined : person.lastContactAt,
    followUps: openFollowUps(person),
    avoidTopics: person.avoidTopics ?? [],
    likes: person.likes ?? [],
    dislikes: person.dislikes ?? [],
    recentNotes: [...person.notes].sort((a, b) => b.at - a.at).slice(0, 3),
    upcoming,
    unrepaidGifts: (person.gifts ?? []).filter((g) => (g.direction ?? "received") === "received" && !g.repaid),
    intentions: (person.intentions ?? []).map((i) => i.text),
    lastAppreciation: appreciationsFor(vault, { personId })[0],
    inspiration: storiesFor(vault, { personId, kind: "received" })[0],
    empty: false,
  };
  brief.empty =
    !brief.lastContact &&
    !brief.lastContactAt &&
    !brief.followUps.length &&
    !brief.avoidTopics.length &&
    !brief.likes.length &&
    !brief.dislikes.length &&
    !brief.recentNotes.length &&
    !brief.upcoming.length &&
    !brief.unrepaidGifts.length &&
    !brief.intentions.length &&
    !person.honorific &&
    !person.nickname;
  return brief;
}
