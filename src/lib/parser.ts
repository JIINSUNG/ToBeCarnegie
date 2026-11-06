// "민수 - 커피는 아메리카노" 같은 한 줄을 {이름, 기록 내용}으로 쪼갠다.
// 어느 구분자를 쓰는지, 그 이름이 실제 vault에 있는지는 호출하는 화면이 결정한다.

export interface ParsedEntry {
  name: string;
  text: string;
}

const SEPARATORS = [" - ", "：", ":", "-", "，", ","];

/** 가장 먼저 나오는 구분자를 기준으로 이름/내용을 나눈다. 이름이나 내용이 비면 null. */
export function parseQuickEntry(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let bestIndex = -1;
  let bestLength = 0;
  for (const sep of SEPARATORS) {
    const idx = trimmed.indexOf(sep);
    if (idx <= 0) continue;
    if (bestIndex === -1 || idx < bestIndex || (idx === bestIndex && sep.length > bestLength)) {
      bestIndex = idx;
      bestLength = sep.length;
    }
  }
  if (bestIndex === -1) return null;

  const name = trimmed.slice(0, bestIndex).trim();
  const text = trimmed.slice(bestIndex + bestLength).trim();
  if (!name || !text) return null;
  return { name, text };
}
