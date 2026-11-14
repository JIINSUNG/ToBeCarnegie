/** 지인 한 명에 대한 기록 한 줄 (예: "커피는 아이스 아메리카노만 마심"). */
export interface Note {
  id: string;
  text: string;
  /** 이 사실을 알게 된/기록한 시각. */
  at: number;
  updatedAt: number;
}

/** 주고받은 선물·돈(축의금·조의금·밥값 등) — 나중에 뭘로 갚을지/갚았는지 체크하는 용도. */
export interface Gift {
  id: string;
  text: string;
  at: number;
  /** 내가 받았는지 줬는지. 이전 데이터엔 없어서 없으면 "received"로 본다(원래 다 받은 선물이었음). */
  direction?: "received" | "given";
  /** 돈이면(축의금·밥값 등) 금액(원). 선물이면 생략. */
  amount?: number;
  /** "받았을 때" 답례했는지 — direction이 "given"이면 의미 없음. */
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
  /** 음력 기준 날짜라는 표시만 — 자동 변환은 안 하고, 날짜는 사용자가 알아서 양력으로 환산해 적는다. */
  lunar?: boolean;
  updatedAt: number;
}

/** "이 사람한텐 이렇게 하고 싶다" 같은, 이 사람에 대한 나만의 다짐. 여러 개 쌓일 수 있다. */
export interface Intention {
  id: string;
  text: string;
  at: number;
  updatedAt: number;
}

/** 연락 종류 — 전화·메시지·만남·기타. */
export type ContactKind = "call" | "message" | "meet" | "etc";

/** 연락 한 번 — "언제, 어떻게" 연락했는지 쌓아서 사람 카드에서 흐름을 본다. */
export interface ContactLog {
  id: string;
  at: number;
  kind: ContactKind;
  /** 무슨 얘기 했는지 한 줄(선택). */
  memo?: string;
  updatedAt: number;
}

/** 다음에 연락·만날 때 물어보거나 챙길 것 — 체크하면 끝. */
export interface FollowUp {
  id: string;
  text: string;
  done: boolean;
  doneAt?: number;
  at: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  /** "MM-DD" 형식. 생일 자체는 몰라도 될 수 있어 선택 입력. */
  birthday?: string;
  /** 태어난 연도(선택) — 모르면 안 적어도 된다. birthday가 있을 때만 의미가 있다. */
  birthdayYear?: number;
  /** "INTJ" 같은 4글자 MBTI (대문자). */
  mbti?: string;
  /** 자유 입력(예: 여성/남성/기타) — 선택 사항, 강제하지 않는다. */
  gender?: string;
  /** 별명 — 이름과 별개로 부르는 호칭(선택). */
  nickname?: string;
  /** 언제·어디서·어떤 계기로 알게 됐는지 한두 줄. */
  metStory?: string;
  /** 이 사람을 부르는 호칭이나 말투(예: "형이라고 부름 · 반말"). */
  honorific?: string;
  /** 이 정도 주기(일)로 연락하고 싶다는 설정 — 두면 "연락 뜸한 사람" 판단에서 기본값 대신 이걸 쓴다. */
  contactFrequencyDays?: number;
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
  /** 내가 상대에게 베푼 호의·도움(받은 은혜의 반대 방향). */
  favorsGiven?: string[];
  /** 꺼내면 안 되는/조심해야 할 대화 주제(예: "최근 이혼함", "부모님 건강 안 좋으심"). */
  avoidTopics?: string[];
  /** "이 사람한텐 이렇게 하고 싶다" 다짐들 */
  intentions?: Intention[];
  /** 연락 기록 — 쌓일 때마다 lastContactAt도 같이 맞춘다. 예전 데이터엔 없음(그땐 lastContactAt만 있었음). */
  contacts?: ContactLog[];
  /** 다음에 물어볼 것·챙길 것. */
  followUps?: FollowUp[];
  createdAt: number;
  updatedAt: number;
}

/** 사용자가 직접 추가한 "오늘의 한마디" 문구 — lib/wisdom.ts의 기본 문구 풀에 섞여서 나온다. */
export interface CustomWisdom {
  id: string;
  text: string;
  /** 책이나 사람에게서 인용한 거면 그 출처 (예: "데일 카네기, 인간관계론"). 직접 쓴 말이면 생략. */
  source?: string;
  createdAt: number;
}

/** 읽은 책 — 독후감과, 그 책에서 뽑아둔 글귀들. */
export interface Book {
  id: string;
  title: string;
  author?: string;
  /** 다 읽은 날("YYYY-MM-DD", 선택). */
  finishedDate?: string;
  /** 별점 1~5(선택). */
  rating?: number;
  /** 독후감 — 길게 써도 된다. */
  review?: string;
  /** 이 책에서 뽑아둔 글귀들. */
  quotes?: string[];
  createdAt: number;
  updatedAt: number;
}

/** "오늘 하루" 동안만 유효한, 사용자가 스스로에게 하는 다짐. 홈 화면 상단에 뜬다. */
export interface DailyIntention {
  text: string;
  /** "YYYY-MM-DD" — 오늘 날짜와 다르면 지난 다짐이라 더 이상 안 보여준다. */
  date: string;
}

/** 스스로에게 주는 반복 미션 — 한 번 만들면 매일 다시 나타나고, 그날그날 체크한다.
 * target이 있으면 "횟수 미션"(예: 고객 5명에게 연락, 물 5잔)으로, + / − 로 세다가 target에 닿으면 달성.
 * 없으면 예전처럼 체크박스 하나로 달성/미달성만 표시한다. (구호 affirmations도 이 타입을 쓰지만 target은 안 쓴다.) */
export interface Mission {
  id: string;
  text: string;
  /** 하루 목표 횟수(1 이상). 없으면 체크박스 미션. */
  target?: number;
  /** 횟수 단위(예: "명", "잔", "쪽") — 표시용, 선택. */
  unit?: string;
  createdAt: number;
  /** 문구·목표를 고친 시각 — 동기화 때 더 최근에 고친 쪽을 남기려고. 예전 데이터엔 없어서 없으면 createdAt으로 본다. */
  updatedAt?: number;
}

/** 횟수 미션의 그날 센 값 — at(마지막으로 바꾼 시각)으로 두 기기 값 중 최신을 고른다. */
export interface MissionCount {
  n: number;
  at: number;
}

/** 성장 일기 한 줄 — 프롬프트에 답했거나 자유롭게 쓴 기록. */
export interface JournalEntry {
  id: string;
  text: string;
  /** 어떤 질문에 답한 건지(선택) — 자유롭게 썼으면 없음. */
  prompt?: string;
  at: number;
}

/** 목표 하나 — 미션과 달리 매일 반복이 아니라 "한 번 달성하면 끝"인 것. */
export interface Goal {
  id: string;
  text: string;
  done: boolean;
  achievedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** 잠금 해제하면 메모리에만 떠 있는 평문 데이터 전체. */
export interface Vault {
  version: number;
  people: Person[];
  /** 마지막으로 백업 파일·코드를 내보낸 시각 (derive.ts의 백업 알림이 참고). */
  lastBackupAt?: number;
  customWisdom?: CustomWisdom[];
  books?: Book[];
  dailyIntention?: DailyIntention;
  /** 아직 아무도 안 속한 그룹도 미리 만들어둘 수 있게 하는 등록부. 실제로 쓰이는 그룹은
   * allGroups()가 이거랑 사람들의 person.groups를 합쳐서 보여준다. */
  groupNames?: string[];
  /** 등록해둔 반복 미션들. */
  missions?: Mission[];
  /** 날짜별로 그날 완료한 미션 id 목록. */
  missionDone?: Record<string, string[]>;
  /** 날짜별 → 미션 id별 그날 센 횟수(횟수 미션만). */
  missionCount?: Record<string, Record<string, MissionCount>>;
  /** 성장 일기. */
  journal?: JournalEntry[];
  /** 매일 아침 외치는 구호들 — 구조는 미션과 같다(문구 + 그날 외쳤는지). */
  affirmations?: Mission[];
  affirmationDone?: Record<string, string[]>;
  /** 이루고 싶은 목표들 — 한 번 달성하면 끝나는 것들(미션처럼 매일 반복 아님). */
  goals?: Goal[];
  /** 스스로 고치고 싶은 점 — goals와 같은 구조, 의미만 "그만하고 싶은 것". */
  improvements?: Goal[];
}

export function emptyVault(): Vault {
  return { version: 1, people: [] };
}
