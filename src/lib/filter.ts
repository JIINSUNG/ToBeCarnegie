// 입력 필터 — 주민등록번호, (Luhn 통과하는) 카드번호, "비밀번호·비번·현관·도어락" 뒤에 적힌 값은
// 저장을 막는다. 그 외 내용은 사용자 자율(관계 메모 앱 특성상 과하게 막으면 오히려 못 쓰게 됨).

// YYMMDD + 1~8(성별·국적 구분) + 6자리. 하이픈·공백은 있어도 없어도 됨.
const RRN_RE = /\b\d{6}[-\s]?[1-8]\d{6}\b/;

// 키워드 뒤에 "는/가/:" 같은 조사·구두점이 붙고 나서 값이 오는 흔한 한국어 어순을 잡는다.
// 키워드와 값 사이에 알파벳·숫자가 아닌 문자가 최대 4개까지만 오게 해서, 멀리 떨어진
// 엉뚱한 숫자까지 잘못 걸리지 않게 한다.
const SENSITIVE_KEYWORD_RE = /(비밀번호|비번|현관|도어락)[^A-Za-z0-9#*\n]{0,4}([A-Za-z0-9#*]{2,})/;

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function hasCardNumber(text: string): boolean {
  const candidates = text.match(/\d(?:[ -]?\d){12,18}/g) ?? [];
  return candidates.some((c) => {
    const digits = c.replace(/[ -]/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnValid(digits);
  });
}

export type BlockReason = "rrn" | "card" | "keyword";

/** 막아야 할 내용이면 이유를, 괜찮으면 null을 돌려준다. */
export function checkSensitive(text: string): BlockReason | null {
  if (RRN_RE.test(text)) return "rrn";
  if (hasCardNumber(text)) return "card";
  if (SENSITIVE_KEYWORD_RE.test(text)) return "keyword";
  return null;
}

export const BLOCK_REASON_LABEL: Record<BlockReason, string> = {
  rrn: "주민등록번호처럼 보이는 내용은 저장할 수 없어요.",
  card: "카드번호처럼 보이는 내용은 저장할 수 없어요.",
  keyword: "비밀번호·현관·도어락 같은 보안 정보는 저장할 수 없어요.",
};
