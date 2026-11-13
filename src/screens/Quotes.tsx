import { useState } from "react";
import { useSession } from "../session";
import { addCustomWisdom, removeCustomWisdom } from "../lib/people";
import { addBook, addBookQuote, deleteBook, isValidRating, removeBookQuote, updateBook } from "../lib/books";
import { checkSensitive, BLOCK_REASON_LABEL } from "../lib/filter";
import { formatDate } from "../lib/format";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";
import { ChipListField } from "../components/ChipListField";
import type { Book, CustomWisdom } from "../types";

type ReflectItem = { text: string; source?: string };

function BookCard({ book, onUpdate, onDelete, onAddQuote, onRemoveQuote }: {
  book: Book;
  onUpdate: (patch: Partial<Pick<Book, "title" | "author" | "finishedDate" | "rating" | "review">>) => void;
  onDelete: () => void;
  onAddQuote: (text: string) => void;
  onRemoveQuote: (index: number) => void;
}) {
  const [review, setReview] = useState(book.review ?? "");

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{book.title}</p>
          {book.author && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>{book.author}</p>}
        </div>
        <button type="button" onClick={onDelete} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, padding: 0, flexShrink: 0 }}>
          삭제
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`별점 ${n}점`}
              aria-pressed={(book.rating ?? 0) >= n}
              onClick={() => onUpdate({ rating: book.rating === n ? undefined : n })}
              style={{ background: "none", border: "none", fontSize: 18, padding: 0, color: (book.rating ?? 0) >= n ? "var(--accent)" : "var(--line)" }}
            >
              ★
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          다 읽은 날
          <input
            type="date"
            value={book.finishedDate ?? ""}
            onChange={(e) => onUpdate({ finishedDate: e.target.value || undefined })}
            style={{ padding: "4px 6px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--field)", fontSize: 13, color: "var(--fg)" }}
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>독후감</span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onBlur={() => {
            if (review !== (book.review ?? "")) onUpdate({ review: review || undefined });
          }}
          placeholder="이 책에서 느낀 것, 기억하고 싶은 생각을 적어두세요"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <ChipListField label="이 책의 글귀" placeholder="예: 인간관계의 비결은 상대의 입장에서 보는 것이다." items={book.quotes ?? []} onAdd={onAddQuote} onRemove={onRemoveQuote} />
    </div>
  );
}

export function Quotes({ onBack }: { onBack: () => void }) {
  const { vault, update } = useSession();
  const quotes: CustomWisdom[] = vault?.customWisdom ?? [];
  const books: Book[] = vault?.books ?? [];

  const [view, setView] = useState<"quotes" | "books">("quotes");
  const [textDraft, setTextDraft] = useState("");
  const [sourceDraft, setSourceDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);

  // 곱씹어보기는 직접 적은 글귀 + 책에서 뽑아둔 글귀를 한 풀에 섞어서 고른다.
  const reflectPool: ReflectItem[] = [
    ...quotes.map((q) => ({ text: q.text, source: q.source })),
    ...books.flatMap((b) => (b.quotes ?? []).map((text) => ({ text, source: b.title }))),
  ];
  const [reflectIndex, setReflectIndex] = useState(() => (reflectPool.length ? Math.floor(Math.random() * reflectPool.length) : null));

  const pickAnother = () => {
    if (reflectPool.length <= 1) return;
    let idx = Math.floor(Math.random() * reflectPool.length);
    if (idx === reflectIndex) idx = (idx + 1) % reflectPool.length;
    setReflectIndex(idx);
  };

  const handleAdd = () => {
    const text = textDraft.trim();
    if (!text) return;
    const reason = checkSensitive(text) ?? checkSensitive(sourceDraft);
    if (reason) {
      setError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    update((v) => addCustomWisdom(v, text, sourceDraft.trim() || undefined));
    setTextDraft("");
    setSourceDraft("");
    setError(null);
    setReflectIndex(reflectPool.length);
  };

  const handleRemove = (id: string) => {
    update((v) => removeCustomWisdom(v, id));
    setReflectIndex(null);
  };

  const handleAddBook = () => {
    const title = titleDraft.trim();
    if (!title) return;
    const reason = checkSensitive(title) ?? checkSensitive(authorDraft);
    if (reason) {
      setBookError(BLOCK_REASON_LABEL[reason]);
      return;
    }
    setBookError(null);
    update((v) => addBook(v, title, authorDraft.trim() || undefined));
    setTitleDraft("");
    setAuthorDraft("");
  };

  const reflecting = reflectIndex != null ? reflectPool[reflectIndex] : undefined;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 홈
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>읽은 것</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <button type="button" onClick={() => setView("quotes")} style={{ ...linkStyle, padding: 0, fontSize: 13, fontWeight: view === "quotes" ? 700 : 400, color: view === "quotes" ? "var(--accent)" : "var(--fg2)" }}>
          글귀
        </button>
        <button type="button" onClick={() => setView("books")} style={{ ...linkStyle, padding: 0, fontSize: 13, fontWeight: view === "books" ? 700 : 400, color: view === "books" ? "var(--accent)" : "var(--fg2)" }}>
          독후감
        </button>
      </div>

      {reflecting ? (
        <div style={reflectBoxStyle}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-fg)", opacity: 0.85 }}>곱씹어보기</span>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--accent-fg)" }}>{reflecting.text}</p>
          {reflecting.source && <p style={{ margin: 0, fontSize: 12.5, color: "var(--accent-fg)", opacity: 0.85 }}>— {reflecting.source}</p>}
          {reflectPool.length > 1 && (
            <button type="button" onClick={pickAnother} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--accent-fg)", opacity: 0.85, fontSize: 12.5, padding: 0 }}>
              다른 글귀 →
            </button>
          )}
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: "6vh" }}>
          책이나 사람에게서 들은 좋은 글귀를 적어두세요.
          <br />
          여기서 다시 꺼내 곱씹어 볼 수 있어요.
        </p>
      )}

      {view === "quotes" ? (
        <>
          <div style={sectionStyle}>
            <h2 style={headingStyle}>글귀 추가</h2>
            <label style={fieldStyle}>
              <span>글귀</span>
              <textarea
                value={textDraft}
                onChange={(e) => {
                  setTextDraft(e.target.value);
                  setError(null);
                }}
                placeholder="예: 인간관계의 비결은 상대의 입장에서 보는 것이다."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>
            <label style={fieldStyle}>
              <span>출처 (선택 · 책이나 사람)</span>
              <input
                value={sourceDraft}
                onChange={(e) => {
                  setSourceDraft(e.target.value);
                  setError(null);
                }}
                placeholder="예: 데일 카네기, 인간관계론"
                style={inputStyle}
              />
            </label>
            {error && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="button" onClick={handleAdd} disabled={!textDraft.trim()} style={primaryBtnStyle}>
              추가
            </button>
          </div>

          {quotes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...quotes]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((q) => (
                  <div key={q.id} style={cardStyle}>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>{q.text}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        {q.source ? `— ${q.source} · ` : ""}
                        {formatDate(q.createdAt)}
                      </span>
                      <button type="button" onClick={() => handleRemove(q.id)} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, padding: 0 }}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={sectionStyle}>
            <h2 style={headingStyle}>책 추가</h2>
            <label style={fieldStyle}>
              <span>제목</span>
              <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="예: 인간관계론" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>지은이 (선택)</span>
              <input value={authorDraft} onChange={(e) => setAuthorDraft(e.target.value)} placeholder="예: 데일 카네기" style={inputStyle} />
            </label>
            {bookError && <p style={{ color: "var(--warn)", fontSize: 13, margin: 0 }}>{bookError}</p>}
            <button type="button" onClick={handleAddBook} disabled={!titleDraft.trim()} style={primaryBtnStyle}>
              추가
            </button>
          </div>

          {books.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", margin: 0 }}>아직 적어둔 책이 없어요.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...books]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((b) => (
                  <BookCard
                    key={b.id}
                    book={b}
                    onUpdate={(patch) => {
                      if (patch.rating != null && !isValidRating(patch.rating)) return;
                      update((v) => updateBook(v, b.id, patch));
                    }}
                    onDelete={() => update((v) => deleteBook(v, b.id))}
                    onAddQuote={(text) => update((v) => addBookQuote(v, b.id, text))}
                    onRemoveQuote={(index) => update((v) => removeBookQuote(v, b.id, index))}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
};
const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const primaryBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "9px 16px",
  borderRadius: 999,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 13.5,
  fontWeight: 600,
};
const reflectBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 16,
  borderRadius: 16,
  background: "var(--accent)",
};
const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
