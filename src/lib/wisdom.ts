// 사람을 대하는 태도에 대한 짧은 조언들 — "칭찬하라, 비난하지 말라"처럼 알고는 있지만 지내다
// 보면 잊어버리는 것들을 계속 눈에 띄게 하는 용도. 홈 화면엔 무작위로, 사람 상세 화면엔 그
// 사람 상태(관계 온도·보답할 선물 등)에 맞는 걸 하나 골라서 보여준다.
import { relationshipTemp } from "./derive";
import type { Person } from "../types";

export type WisdomTag =
  | "칭찬"
  | "경청"
  | "관심"
  | "비판자제"
  | "감사"
  | "연락"
  | "친절"
  | "약속"
  | "포용"
  | "축하"
  | "꾸준함"
  | "보답"
  | "자존감"
  | "이해";

export interface WisdomQuote {
  id: string;
  text: string;
  tags: WisdomTag[];
}

export const WISDOM: WisdomQuote[] = [
  { id: "w1", text: "비판보다 이해가 먼저예요. 왜 그랬을지 한 번 더 생각해봐요.", tags: ["비판자제", "이해"] },
  { id: "w2", text: "사람은 비난받으면 방어적이 될 뿐 잘 바뀌지 않아요. 지적보다 격려가 더 잘 통해요.", tags: ["비판자제"] },
  { id: "w3", text: "작은 칭찬 한마디가 그 사람의 하루를 바꿀 수 있어요.", tags: ["칭찬"] },
  { id: "w4", text: "잘한 걸 구체적으로 짚어서 칭찬하면 진심이 더 잘 전해져요.", tags: ["칭찬"] },
  { id: "w5", text: "내 얘기보다 상대 얘기를 더 들어주세요. 경청이 최고의 호감 표현이에요.", tags: ["경청"] },
  { id: "w6", text: "말을 끊지 않고 끝까지 들어주는 것만으로도 신뢰가 쌓여요.", tags: ["경청"] },
  { id: "w7", text: "그 사람이 요즘 관심 있는 게 뭔지 한 번 물어봐요.", tags: ["관심"] },
  { id: "w8", text: "사소한 디테일(좋아하는 음식, 요즘 고민)을 기억해두면 다음에 만났을 때 큰 힘이 돼요.", tags: ["관심", "이해"] },
  { id: "w9", text: "먼저 연락하는 사람이 결국 더 오래가는 관계를 만들어요.", tags: ["연락", "꾸준함"] },
  { id: "w10", text: "뜸해진 사이일수록 안부 한마디가 더 큰 의미를 가져요.", tags: ["연락"] },
  { id: "w11", text: "이름을 기억하고 불러주는 것, 그것만으로도 특별한 사람이 돼요.", tags: ["관심"] },
  { id: "w12", text: "작은 친절은 쌓여서 큰 신뢰가 됩니다.", tags: ["친절"] },
  { id: "w13", text: "도움을 받았으면 꼭 갚으려 하지 않아도, 기억하고 감사를 표현하는 것만으로 충분해요.", tags: ["감사", "보답"] },
  { id: "w14", text: "받은 선물보다, 그 마음을 오래 기억해주는 게 더 큰 선물이에요.", tags: ["감사", "보답"] },
  { id: "w15", text: "약속은 작은 것부터 꼭 지켜야 신뢰가 쌓여요.", tags: ["약속"] },
  { id: "w16", text: "실수했을 때 먼저 사과하는 사람이 관계를 지킵니다.", tags: ["포용", "약속"] },
  { id: "w17", text: "사람은 완벽하지 않아요. 상대의 부족한 점보다 노력하는 점을 봐주세요.", tags: ["포용", "이해"] },
  { id: "w18", text: "화가 날 때일수록 하루 정도 묵혀두고 다시 생각해보면 다르게 보여요.", tags: ["비판자제", "포용"] },
  { id: "w19", text: "축하할 일엔 누구보다 먼저 축하해주세요. 그 순간이 오래 기억에 남아요.", tags: ["축하"] },
  { id: "w20", text: "힘든 시기엔 해결책보다 그냥 옆에 있어주는 게 더 필요할 때가 많아요.", tags: ["이해", "관심"] },
  { id: "w21", text: "상대의 입장에서 한 번 더 생각해보면 오해가 줄어들어요.", tags: ["이해"] },
  { id: "w22", text: "내가 원하는 대로가 아니라, 그 사람이 원하는 방식으로 마음을 표현해보세요.", tags: ["이해", "관심"] },
  { id: "w23", text: "꾸준한 안부가 특별한 이벤트보다 관계를 더 단단하게 만들어요.", tags: ["꾸준함", "연락"] },
  { id: "w24", text: "자존감을 세워주는 말 한마디가 그 사람을 정말 바꿀 수도 있어요.", tags: ["자존감", "칭찬"] },
  { id: "w25", text: "진심 어린 관심은 숨길 수 없어요. 꾸며낸 관심보다 늘 더 잘 전해집니다.", tags: ["관심"] },
  { id: "w26", text: "상대의 성취를 질투 없이 진심으로 축하해줄 수 있다면, 그 관계는 오래갑니다.", tags: ["축하", "자존감"] },
  { id: "w27", text: "대화 중엔 핸드폰보다 그 사람의 눈을 봐주세요.", tags: ["경청", "관심"] },
  { id: "w28", text: "\"고마워\"라는 말은 아무리 해도 지나치지 않아요.", tags: ["감사"] },
  { id: "w29", text: "다른 사람과 비교하며 말하는 건 피하세요. 그 사람 자체로 봐주세요.", tags: ["자존감", "비판자제"] },
  { id: "w30", text: "같은 실수를 반복해도, 한 번 더 믿어주는 사람이 진짜 내 편이에요.", tags: ["포용"] },
  { id: "w31", text: "말보다 행동으로 보여주는 작은 배려가 더 오래 기억에 남아요.", tags: ["친절", "이해"] },
  { id: "w32", text: "관계는 받은 만큼이 아니라, 준 만큼 더 깊어져요.", tags: ["보답", "친절"] },
];

export function pickRandomWisdom(excludeId?: string): WisdomQuote {
  const pool = excludeId ? WISDOM.filter((w) => w.id !== excludeId) : WISDOM;
  return pool[Math.floor(Math.random() * pool.length)];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 관계 온도·보답할 선물 유무로 지금 이 사람에게 어울리는 태그를 고른다. */
export function relevantTagsForPerson(person: Person, now: number = Date.now()): WisdomTag[] {
  const tags: WisdomTag[] = [];
  if ((person.gifts ?? []).some((g) => !g.repaid)) tags.push("보답", "감사");
  const temp = relationshipTemp(person, now);
  if (temp === "cooling" || temp === "unknown") tags.push("연락", "꾸준함");
  else tags.push("경청", "관심", "칭찬");
  return tags;
}

/** 이 사람에게 어울리는 문구를 하나 고른다. 매번 바뀌지 않고 같은 사람·같은 상태면 늘 같은
 * 문구가 나오게(id로 고정) — "이 사람 전용 한마디"처럼 느껴지도록. */
export function pickWisdomForPerson(person: Person, now: number = Date.now()): WisdomQuote {
  const tags = relevantTagsForPerson(person, now);
  const pool = WISDOM.filter((w) => w.tags.some((t) => tags.includes(t)));
  const list = pool.length > 0 ? pool : WISDOM;
  return list[hashString(person.id) % list.length];
}
