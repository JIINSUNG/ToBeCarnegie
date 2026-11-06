/** 지인 한 명에 대한 기록 한 줄 (예: "커피는 아이스 아메리카노만 마심"). */
export interface Note {
  id: string;
  text: string;
  /** 이 사실을 알게 된/기록한 시각. */
  at: number;
  updatedAt: number;
}

/** 받은 선물 — 나중에 뭘로 갚을지/갚았는지 체크하는 용도. */
export interface Gift {
  id: string;
  text: string;
  at: number;
  repaid: boolean;
  repaidAt?: number;
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
  /** 이전 버전 데이터엔 없을 수 있어 optional — 읽을 땐 항상 `person.gifts ?? []`로 다뤄요. */
  gifts?: Gift[];
  createdAt: number;
  updatedAt: number;
}

/** 잠금 해제하면 메모리에만 떠 있는 평문 데이터 전체. */
export interface Vault {
  version: number;
  people: Person[];
  /** 마지막으로 백업 파일·코드를 내보낸 시각 (derive.ts의 백업 알림이 참고). */
  lastBackupAt?: number;
}

export function emptyVault(): Vault {
  return { version: 1, people: [] };
}
