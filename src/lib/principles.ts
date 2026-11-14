// 카네기 인간관계 원칙 챌린지 — 주마다 원칙 하나를 골라 실천한 순간을 남긴다.
// 원칙 문구는 『인간관계론』의 원칙들을 이 앱에서 쓰기 좋게 짧게 풀어 쓴 것이고, tip은 바로 해볼 수 있는 실천 요령.
import { nanoid } from "nanoid";
import { markDeleted } from "./period-goals";
import type { PrinciplePractice, Vault } from "../types";

export interface Principle {
  id: string;
  part: "기본" | "호감" | "설득" | "변화";
  text: string;
  tip: string;
}

export const PRINCIPLE_PARTS: Record<Principle["part"], string> = {
  기본: "사람을 대하는 기본",
  호감: "호감을 얻는 법",
  설득: "내 생각에 공감하게 하는 법",
  변화: "마음 상하지 않게 바꾸는 법",
};

export const PRINCIPLES: Principle[] = [
  { id: "p1", part: "기본", text: "비난하거나 비판하거나 불평하지 않는다", tip: "불평이 입에 맴돌면 '이 사람은 왜 그랬을까?'를 먼저 떠올려보기." },
  { id: "p2", part: "기본", text: "솔직하고 진심 어린 인정을 표현한다", tip: "결과보다 그 사람이 들인 노력을 구체적으로 짚어서 말하기." },
  { id: "p3", part: "기본", text: "상대가 원하는 것에서 이야기를 시작한다", tip: "부탁하기 전에 '이게 저 사람에게 어떤 점이 좋을까?'부터 말하기." },
  { id: "p4", part: "호감", text: "다른 사람에게 진심으로 관심을 갖는다", tip: "오늘 만나는 사람의 요즘 관심사를 하나 물어보기." },
  { id: "p5", part: "호감", text: "웃는 얼굴로 대한다", tip: "인사할 때·전화 받을 때 먼저 미소 짓고 시작하기." },
  { id: "p6", part: "호감", text: "이름을 기억하고 불러준다", tip: "대화 중에 상대 이름을 한두 번 불러주고, 새로 만난 사람 이름은 기록해두기." },
  { id: "p7", part: "호감", text: "잘 듣고, 상대가 자기 이야기를 하게 한다", tip: "말을 끊지 않고 '그래서 어떻게 됐어요?'로 이어가게 하기." },
  { id: "p8", part: "호감", text: "상대의 관심사에 맞춰 이야기한다", tip: "만나기 전에 그 사람이 좋아하는 것 하나를 떠올려 화제로 꺼내기." },
  { id: "p9", part: "호감", text: "상대가 중요한 사람이라고 느끼게 한다", tip: "상대의 의견을 물어보고, 그 의견을 실제로 반영했다고 알려주기." },
  { id: "p10", part: "설득", text: "논쟁을 피한다", tip: "의견이 부딪치면 이기려 하지 말고 '그렇게 볼 수도 있겠네요'로 한 번 받기." },
  { id: "p11", part: "설득", text: "상대 의견을 존중하고 '틀렸다'고 말하지 않는다", tip: "'제가 잘못 알고 있을 수도 있는데요'로 말 꺼내기." },
  { id: "p12", part: "설득", text: "내가 틀렸으면 빨리, 분명하게 인정한다", tip: "변명보다 '제 실수였어요' 한 마디를 먼저." },
  { id: "p13", part: "설득", text: "부드럽고 친근하게 시작한다", tip: "어려운 얘기일수록 고마운 점 하나로 대화를 열기." },
  { id: "p14", part: "설득", text: "상대가 처음부터 '네'라고 말하게 한다", tip: "서로 동의할 수 있는 것부터 확인하고 본론으로 가기." },
  { id: "p15", part: "설득", text: "상대가 더 많이 말하게 한다", tip: "내 말 비중을 절반 아래로 줄여보기." },
  { id: "p16", part: "설득", text: "상대가 스스로 생각해낸 것처럼 느끼게 한다", tip: "답을 주기보다 '어떻게 하면 좋을까요?'로 물어보기." },
  { id: "p17", part: "설득", text: "상대 입장에서 보려고 진심으로 애쓴다", tip: "반박하기 전에 '저 사람이라면 왜 그렇게 생각할까' 한 줄 적어보기." },
  { id: "p18", part: "설득", text: "상대의 생각과 바람에 공감한다", tip: "'그렇게 느끼실 만해요'를 진심으로 말하기." },
  { id: "p19", part: "설득", text: "상대의 좋은 동기에 호소한다", tip: "'꼼꼼하신 분이라 이해해주실 것 같아서요'처럼 좋은 면을 믿고 부탁하기." },
  { id: "p20", part: "설득", text: "생각을 생생하게 보여준다", tip: "말로만 하지 말고 예시·사진·숫자로 보여주기." },
  { id: "p21", part: "설득", text: "도전 의욕을 불러일으킨다", tip: "'이건 좀 어려운 건데 해볼래요?'처럼 해볼 만한 목표로 제안하기." },
  { id: "p22", part: "변화", text: "칭찬과 진심 어린 인정으로 시작한다", tip: "고칠 점을 말하기 전에 잘한 점을 먼저 구체적으로." },
  { id: "p23", part: "변화", text: "실수는 돌려서 알려준다", tip: "'그런데'보다 '그리고'로 이어서 말하기." },
  { id: "p24", part: "변화", text: "남을 지적하기 전에 내 실수부터 이야기한다", tip: "'나도 예전에 똑같이 했었는데'로 시작하기." },
  { id: "p25", part: "변화", text: "명령 대신 질문한다", tip: "'이렇게 해' 대신 '이렇게 해보면 어떨까요?'" },
  { id: "p26", part: "변화", text: "상대의 체면을 세워준다", tip: "지적은 꼭 둘이 있을 때만, 칭찬은 여럿 앞에서." },
  { id: "p27", part: "변화", text: "작은 발전도 진심으로 칭찬한다", tip: "어제보다 나아진 점 하나를 찾아 바로 말해주기." },
  { id: "p28", part: "변화", text: "상대가 지키고 싶어 할 좋은 평판을 준다", tip: "'역시 약속은 꼭 지키시는 분이죠'처럼 기대를 담아 말하기." },
  { id: "p29", part: "변화", text: "격려해서 고칠 점이 쉬워 보이게 한다", tip: "'이 정도면 금방 익숙해질 거예요'로 부담 덜어주기." },
  { id: "p30", part: "변화", text: "내 제안을 상대가 기꺼이 하고 싶게 만든다", tip: "그 일이 상대에게 어떤 의미·이득이 있는지 함께 말하기." },
];

export function findPrinciple(id: string | undefined): Principle | undefined {
  return PRINCIPLES.find((p) => p.id === id);
}

/** 그 주에 고른 원칙(없으면 undefined). */
export function principleFor(vault: Vault, weekKey: string): Principle | undefined {
  return findPrinciple((vault.principleWeeks ?? []).find((w) => w.id === weekKey)?.principleId);
}

export function choosePrinciple(vault: Vault, weekKey: string, principleId: string): Vault {
  const rest = (vault.principleWeeks ?? []).filter((w) => w.id !== weekKey);
  return { ...vault, principleWeeks: [...rest, { id: weekKey, principleId, updatedAt: Date.now() }] };
}

/** 원칙별로 실천한 횟수. */
export function practiceCounts(vault: Vault): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of vault.principlePractices ?? []) out[p.principleId] = (out[p.principleId] ?? 0) + 1;
  return out;
}

/** 이번 주에 추천할 원칙 — 아직 덜 해본 원칙 중에서, 주마다 순서대로 돌아가며(같은 주엔 늘 같은 추천). */
export function suggestPrinciple(vault: Vault, weekKey: string): Principle {
  const counts = practiceCounts(vault);
  const chosenBefore = new Set((vault.principleWeeks ?? []).filter((w) => w.id !== weekKey).map((w) => w.principleId));
  const min = Math.min(...PRINCIPLES.map((p) => counts[p.id] ?? 0));
  let pool = PRINCIPLES.filter((p) => (counts[p.id] ?? 0) === min && !chosenBefore.has(p.id));
  if (!pool.length) pool = PRINCIPLES.filter((p) => (counts[p.id] ?? 0) === min);
  const n = Number(weekKey.replace(/\D/g, "")) || 0;
  return pool[n % pool.length];
}

export function addPractice(vault: Vault, weekKey: string, principleId: string, text: string, personId?: string, at: number = Date.now(), id: string = nanoid()): Vault {
  const p: PrinciplePractice = { id, weekKey, principleId, text: text.trim(), ...(personId ? { personId } : {}), at, updatedAt: Date.now() };
  return { ...vault, principlePractices: [...(vault.principlePractices ?? []), p] };
}

export function deletePractice(vault: Vault, id: string): Vault {
  return markDeleted({ ...vault, principlePractices: (vault.principlePractices ?? []).filter((p) => p.id !== id) }, id);
}

export function practicesFor(vault: Vault, filter: { weekKey?: string; personId?: string } = {}): PrinciplePractice[] {
  return (vault.principlePractices ?? [])
    .filter((p) => !filter.weekKey || p.weekKey === filter.weekKey)
    .filter((p) => !filter.personId || p.personId === filter.personId)
    .sort((a, b) => b.at - a.at);
}
