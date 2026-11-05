/** 지인 한 명에 대한 기록 한 줄 (예: "커피는 아이스 아메리카노만 마심"). */
export interface Note {
  id: string;
  text: string;
  /** 이 사실을 알게 된/기록한 시각. */
  at: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  /** "MM-DD" 형식만 저장 — 생년(나이)까지는 안 남긴다. */
  birthday?: string;
  tags: string[];
  /** 마지막으로 연락·만남한 시각(사용자가 직접 갱신). */
  lastContactAt?: number;
  notes: Note[];
  createdAt: number;
  updatedAt: number;
}

/** 잠금 해제하면 메모리에만 떠 있는 평문 데이터 전체. */
export interface Vault {
  version: number;
  people: Person[];
}

export function emptyVault(): Vault {
  return { version: 1, people: [] };
}
