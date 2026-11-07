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
  /** 뭘로 갚았는지(선택). 체크 안 했어도 미리 적어둘 수 있다. */
  repaidWith?: string;
  updatedAt: number;
}

/** 생일 말고 직접 이름 붙여서 챙기는 기념일 (처음 만난 날, 결혼기념일 등). */
export interface Anniversary {
  id: string;
  label: string;
  /** "YYYY-MM-DD" — 몇 년 됐는지도 보여줄 수 있게 연도까지 저장(생일과 달리 나이 노출 걱정이 없음). */
  date: string;
  updatedAt: number;
}

/** "이 사람한텐 이렇게 하고 싶다" 같은, 이 사람에 대한 나만의 다짐. 여러 개 쌓일 수 있다. */
export interface Intention {
  id: string;
  text: string;
  at: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  /** "MM-DD" 형식만 저장 — 생년(나이)까지는 안 남긴다. */
  birthday?: string;
  /** "INTJ" 같은 4글자 MBTI (대문자). */
  mbti?: string;
  tags: string[];
  /** 태그와 별개로, 사람을 묶어서 관리하는 그룹(가족/직장 등). 자유 목록, PersonEdit에서 고른다. */
  groups?: string[];
  /** 마지막으로 연락·만남한 시각(사용자가 직접 갱신). */
  lastContactAt?: number;
  notes: Note[];
  /** 이전 버전 데이터엔 없을 수 있어 optional — 읽을 땐 항상 `person.gifts ?? []`로 다뤄요. */
  gifts?: Gift[];
  anniversaries?: Anniversary[];
  /** 상대가 좋아하는 것 */
  likes?: string[];
  /** 상대가 싫어하는 것 */
  dislikes?: string[];
  /** 상대에게 받은 은혜·도움 */
  favors?: string[];
  /** "이 사람한텐 이렇게 하고 싶다" 다짐들 */
  intentions?: Intention[];
  createdAt: number;
  updatedAt: number;
}

/** 사용자가 직접 추가한 "오늘의 한마디" 문구 — lib/wisdom.ts의 기본 문구 풀에 섞여서 나온다. */
export interface CustomWisdom {
  id: string;
  text: string;
  createdAt: number;
}

/** "오늘 하루" 동안만 유효한, 사용자가 스스로에게 하는 다짐. 홈 화면 상단에 뜬다. */
export interface DailyIntention {
  text: string;
  /** "YYYY-MM-DD" — 오늘 날짜와 다르면 지난 다짐이라 더 이상 안 보여준다. */
  date: string;
}

/** 잠금 해제하면 메모리에만 떠 있는 평문 데이터 전체. */
export interface Vault {
  version: number;
  people: Person[];
  /** 마지막으로 백업 파일·코드를 내보낸 시각 (derive.ts의 백업 알림이 참고). */
  lastBackupAt?: number;
  customWisdom?: CustomWisdom[];
  dailyIntention?: DailyIntention;
}

export function emptyVault(): Vault {
  return { version: 1, people: [] };
}
