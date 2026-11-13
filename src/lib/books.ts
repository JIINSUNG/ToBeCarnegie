// 읽은 책 — 독후감과 그 책에서 뽑은 글귀. people.ts와 같은 패턴(새 Vault를 돌려주는 불변 업데이트).
import { nanoid } from "nanoid";
import type { Book, Vault } from "../types";

export function addBook(vault: Vault, title: string, author?: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const book: Book = { id, title, author: author || undefined, quotes: [], createdAt: now, updatedAt: now };
  return { ...vault, books: [...(vault.books ?? []), book] };
}

export function updateBook(
  vault: Vault,
  id: string,
  patch: Partial<Pick<Book, "title" | "author" | "finishedDate" | "rating" | "review">>
): Vault {
  return {
    ...vault,
    books: (vault.books ?? []).map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)),
  };
}

export function deleteBook(vault: Vault, id: string): Vault {
  return { ...vault, books: (vault.books ?? []).filter((b) => b.id !== id) };
}

export function addBookQuote(vault: Vault, bookId: string, text: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    books: (vault.books ?? []).map((b) => (b.id === bookId ? { ...b, quotes: [...(b.quotes ?? []), text], updatedAt: now } : b)),
  };
}

export function removeBookQuote(vault: Vault, bookId: string, index: number): Vault {
  return {
    ...vault,
    books: (vault.books ?? []).map((b) =>
      b.id === bookId ? { ...b, quotes: (b.quotes ?? []).filter((_, i) => i !== index), updatedAt: Date.now() } : b
    ),
  };
}

export function findBook(vault: Vault, id: string): Book | undefined {
  return (vault.books ?? []).find((b) => b.id === id);
}

/** 1~5 별점인지. */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}
