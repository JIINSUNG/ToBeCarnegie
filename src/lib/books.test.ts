import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { addBook, addBookQuote, deleteBook, findBook, isValidRating, removeBookQuote, updateBook } from "./books";

describe("books", () => {
  it("addBook으로 책을 추가하면 목록에 하나 늘어난다", () => {
    const v = addBook(emptyVault(), "인간관계론", "데일 카네기");
    expect(v.books).toHaveLength(1);
    expect(v.books![0].title).toBe("인간관계론");
    expect(v.books![0].author).toBe("데일 카네기");
    expect(v.books![0].quotes).toEqual([]);
  });

  it("updateBook은 넘긴 필드만 바꾼다", () => {
    let v = addBook(emptyVault(), "인간관계론");
    const id = v.books![0].id;
    v = updateBook(v, id, { rating: 5, review: "다시 읽어도 좋다" });
    expect(findBook(v, id)?.rating).toBe(5);
    expect(findBook(v, id)?.review).toBe("다시 읽어도 좋다");
    expect(findBook(v, id)?.title).toBe("인간관계론");
  });

  it("deleteBook이 그 책만 지운다", () => {
    let v = addBook(emptyVault(), "책1");
    v = addBook(v, "책2");
    const id1 = v.books![0].id;
    v = deleteBook(v, id1);
    expect(v.books).toHaveLength(1);
    expect(v.books![0].title).toBe("책2");
  });

  it("addBookQuote·removeBookQuote가 그 책의 quotes만 건드린다", () => {
    let v = addBook(emptyVault(), "인간관계론");
    const id = v.books![0].id;
    v = addBookQuote(v, id, "상대의 입장에서 보라");
    expect(findBook(v, id)?.quotes).toEqual(["상대의 입장에서 보라"]);

    v = removeBookQuote(v, id, 0);
    expect(findBook(v, id)?.quotes).toEqual([]);
  });

  it("isValidRating은 1~5 정수만 허용한다", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
  });
});
