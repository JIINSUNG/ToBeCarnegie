import { describe, expect, it } from "vitest";
import { checkSensitive } from "./filter";

describe("checkSensitive", () => {
  it("주민등록번호 형식을 막는다", () => {
    expect(checkSensitive("내 번호는 901231-1234567이야")).toBe("rrn");
    expect(checkSensitive("9012311234567")).toBe("rrn");
  });

  it("Luhn을 통과하는 카드번호를 막는다", () => {
    expect(checkSensitive("카드번호 4111 1111 1111 1111")).toBe("card");
    expect(checkSensitive("4532015112830366")).toBe("card");
  });

  it("Luhn을 통과하지 않는 숫자열(카드번호가 아님)은 안 막는다", () => {
    expect(checkSensitive("전화번호 010-1234-5678")).toBeNull();
    expect(checkSensitive("1234567890123456")).toBeNull();
  });

  it("비밀번호·비번·현관·도어락 뒤에 값이 있으면 막는다", () => {
    expect(checkSensitive("현관 비번: 1234")).toBe("keyword");
    expect(checkSensitive("도어락 5678")).toBe("keyword");
    expect(checkSensitive("비밀번호는 abcd12")).toBe("keyword");
  });

  it("그 키워드가 없거나 뒤에 값이 없으면 안 막는다", () => {
    expect(checkSensitive("현관 앞에서 만나기로 함")).toBeNull();
    expect(checkSensitive("비밀번호 얘기는 안 했음")).toBeNull();
  });

  it("평범한 메모는 막지 않는다", () => {
    expect(checkSensitive("커피는 아이스 아메리카노만 마심")).toBeNull();
    expect(checkSensitive("생일은 3월 15일, 고양이 두 마리 키움")).toBeNull();
  });
});
