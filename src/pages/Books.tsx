import { useCallback, useEffect, useState } from "react";
import { BookPlus, BookmarkPlus, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import CheckoutModal from "../components/CheckoutModal";
import { api } from "../api";
import Badge from "../components/Badge";
import BookForm, { type Book, type Category } from "../components/BookForm";
import CategoryManager from "../components/CategoryManager";

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Book | "new" | null>(null);
  const [showCats, setShowCats] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [circ, setCirc] = useState<{ mode: "issue" | "reserve"; bookId: number } | null>(null);
  const [notice, setNotice] = useState("");

  const loadCategories = useCallback(() => {
    api<{ categories: Category[] }>("/categories").then((r) => setCategories(r.categories)).catch(() => undefined);
  }, []);

  const loadBooks = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (availability) params.set("availability", availability);
    return api<{ books: Book[] }>(`/books?${params}`)
      .then((r) => {
        setBooks(r.books);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, category, availability]);

  useEffect(loadCategories, [loadCategories]);
  useEffect(() => {
    const t = setTimeout(loadBooks, 250); // debounce typing
    return () => clearTimeout(t);
  }, [loadBooks]);

  async function remove(id: number) {
    setError("");
    try {
      await api(`/books/${id}`, { method: "DELETE" });
      setConfirmId(null);
      loadBooks();
      loadCategories();
    } catch (err) {
      setConfirmId(null);
      setError(err instanceof Error ? err.message : "Could not delete the book");
    }
  }

  function saved() {
    setEditing(null);
    loadBooks();
    loadCategories();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Books</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowCats(true)}>
            <Tags size={16} aria-hidden /> Categories
          </button>
          <button className="btn" onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden /> Add book
          </button>
        </div>
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="bk-q" className="mb-1 block text-sm font-medium">Search</label>
          <div className="relative">
            <Search size={16} aria-hidden className="absolute left-3 top-2.5 text-slate-400" />
            <input id="bk-q" type="search" className="input pl-9" placeholder="Title, author, ISBN or publisher" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="bk-cat" className="mb-1 block text-sm font-medium">Category</label>
          <select id="bk-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="none">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-av" className="mb-1 block text-sm font-medium">Availability</label>
          <select id="bk-av" className="input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">Any</option>
            <option value="available">Available now</option>
            <option value="unavailable">All copies out</option>
            <option value="borrowed">Currently borrowed</option>
            <option value="reserved">Reserved</option>
            <option value="overdue">Has overdue copies</option>
          </select>
        </div>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Books in the catalog</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="p-3">Title</th>
              <th scope="col" className="p-3">Author</th>
              <th scope="col" className="p-3">ISBN</th>
              <th scope="col" className="p-3">Category</th>
              <th scope="col" className="p-3">Availability</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-medium">{b.title}</div>
                  {b.publisher && <div className="text-xs text-slate-500">{b.publisher}</div>}
                </td>
                <td className="p-3">{b.author}</td>
                <td className="p-3 font-mono text-xs">{b.isbn || "—"}</td>
                <td className="p-3">{b.category || <span className="text-slate-400">—</span>}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={b.available_copies > 0 ? "green" : "red"}>
                      {b.available_copies} of {b.total_copies} available
                    </Badge>
                    {!!b.borrowed_copies && <Badge tone="blue">{b.borrowed_copies} borrowed</Badge>}
                    {!!b.overdue_copies && <Badge tone="red">{b.overdue_copies} overdue</Badge>}
                    {!!b.reserved_count && (
                      <Badge tone="amber">
                        {b.reserved_count} reserved{b.ready_count ? ` (${b.ready_count} ready)` : ""}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {confirmId === b.id ? (
                      <>
                        <span className="self-center text-xs text-slate-600">Delete this book?</span>
                        <button className="btn-secondary border-red-300 text-red-700" onClick={() => remove(b.id)}>Yes, delete</button>
                        <button className="btn-secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {b.available_copies > 0 ? (
                          <button aria-label={`Issue ${b.title}`} className="btn-secondary" onClick={() => setCirc({ mode: "issue", bookId: b.id })}>
                            <BookPlus size={14} aria-hidden /> Issue
                          </button>
                        ) : (
                          <button aria-label={`Reserve ${b.title}`} className="btn-secondary" onClick={() => setCirc({ mode: "reserve", bookId: b.id })}>
                            <BookmarkPlus size={14} aria-hidden /> Reserve
                          </button>
                        )}
                        <button aria-label={`Edit ${b.title}`} className="btn-secondary" onClick={() => setEditing(b)}>
                          <Pencil size={14} aria-hidden /> Edit
                        </button>
                        <button aria-label={`Delete ${b.title}`} className="btn-secondary" onClick={() => setConfirmId(b.id)}>
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && books.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No books match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">{books.length} book{books.length === 1 ? "" : "s"} shown</p>

      {editing && (
        <BookForm book={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={saved} />
      )}
      {circ && (
        <CheckoutModal
          mode={circ.mode}
          bookId={circ.bookId}
          onClose={() => setCirc(null)}
          onDone={(m) => {
            setCirc(null);
            setNotice(m);
            loadBooks();
          }}
        />
      )}
      {showCats && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCats(false)}
          onChanged={() => {
            loadCategories();
            loadBooks();
          }}
        />
      )}
    </div>
  );
}
