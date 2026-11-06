import { describe, expect, it } from "vitest";
import { parseQuickEntry } from "./parser";

describe("parseQuickEntry", () => {
  it("'이름 - 내용' 형태를 나눈다", () => {
    expect(parseQuickEntry("민수 - 커피는 아메리카노")).toEqual({ name: "민수", text: "커피는 아메리카노" });
  });

  it("콜론 구분자도 지원한다", () => {
    expect(parseQuickEntry("민수: 헬스장 다님")).toEqual({ name: "민수", text: "헬스장 다님" });
  });

  it("전각 콜론·쉼표도 지원한다", () => {
    expect(parseQuickEntry("민수：생일 선물 좋아함")).toEqual({ name: "민수", text: "생일 선물 좋아함" });
    expect(parseQuickEntry("민수，고양이 키움")).toEqual({ name: "민수", text: "고양이 키움" });
  });

  it("가장 먼저 나오는 구분자만 기준으로 삼는다", () => {
    expect(parseQuickEntry("민수 - 커피는 아메리카노 - 디카페인 선호")).toEqual({
      name: "민수",
      text: "커피는 아메리카노 - 디카페인 선호",
    });
  });

  it("구분자가 없으면 null", () => {
    expect(parseQuickEntry("그냥 아무 텍스트")).toBeNull();
  });

  it("이름이나 내용 중 하나가 비면 null", () => {
    expect(parseQuickEntry(" - 내용만 있음")).toBeNull();
    expect(parseQuickEntry("민수 - ")).toBeNull();
  });

  it("빈 문자열은 null", () => {
    expect(parseQuickEntry("")).toBeNull();
    expect(parseQuickEntry("   ")).toBeNull();
  });

  it("앞뒤 공백은 trim된다", () => {
    expect(parseQuickEntry("  민수 -   커피는 아메리카노  ")).toEqual({ name: "민수", text: "커피는 아메리카노" });
  });
});
