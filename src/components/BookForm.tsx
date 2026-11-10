import { useState, type FormEvent } from "react";
import { api } from "../api";
import Modal from "./Modal";

export interface Category {
  id: number;
  name: string;
  book_count?: number;
}
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  category_id: number | null;
  category: string | null;
  total_copies: number;
  available_copies: number;
  borrowed_copies?: number;
  overdue_copies?: number;
  reserved_count?: number;
  ready_count?: number;
}

export default function BookForm({
  book,
  categories,
  onClose,
  onSaved,
}: {
  book: Book | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: book?.title ?? "",
    author: book?.author ?? "",
    isbn: book?.isbn ?? "",
    publisher: book?.publisher ?? "",
    category_id: book?.category_id ? String(book.category_id) : "",
    total_copies: String(book?.total_copies ?? 1),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...f, total_copies: Number(f.total_copies) };
      if (book) await api(`/books/${book.id}`, { method: "PUT", body });
      else await api("/books", { body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={book ? "Edit book" : "Add book"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="b-title" className="mb-1 block text-sm font-medium">Title</label>
          <input id="b-title" required className="input" value={f.title} onChange={set("title")} />
        </div>
        <div>
          <label htmlFor="b-author" className="mb-1 block text-sm font-medium">Author</label>
          <input id="b-author" required className="input" value={f.author} onChange={set("author")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="b-isbn" className="mb-1 block text-sm font-medium">ISBN</label>
            <input id="b-isbn" className="input" placeholder="10 or 13 digits" value={f.isbn} onChange={set("isbn")} />
          </div>
          <div>
            <label htmlFor="b-pub" className="mb-1 block text-sm font-medium">Publisher</label>
            <input id="b-pub" className="input" value={f.publisher} onChange={set("publisher")} />
          </div>
          <div>
            <label htmlFor="b-cat" className="mb-1 block text-sm font-medium">Category</label>
            <select id="b-cat" className="input" value={f.category_id} onChange={set("category_id")}>
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="b-qty" className="mb-1 block text-sm font-medium">Total copies</label>
            <input id="b-qty" type="number" min={0} required className="input" value={f.total_copies} onChange={set("total_copies")} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : book ? "Save changes" : "Add book"}</button>
        </div>
      </form>
    </Modal>
  );
}
