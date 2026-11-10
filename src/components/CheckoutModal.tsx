import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api";
import Modal from "./Modal";
import Picker from "./Picker";
import type { Book } from "./BookForm";
import type { Member } from "./MemberForm";

/**
 * Issue a book to a member, or reserve it for them.
 * Pass `bookId` / `memberId` to pre-select one side.
 */
export default function CheckoutModal({
  mode,
  bookId,
  memberId,
  onClose,
  onDone,
}: {
  mode: "issue" | "reserve";
  bookId?: number;
  memberId?: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [book, setBook] = useState<number | null>(bookId ?? null);
  const [member, setMember] = useState<number | null>(memberId ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ books: Book[] }>("/books").then((r) => setBooks(r.books)).catch((e) => setError(e.message));
    api<{ members: Member[] }>("/members?status=active").then((r) => setMembers(r.members)).catch((e) => setError(e.message));
  }, []);

  const bookOptions = useMemo(
    () =>
      books.map((b) => ({
        id: b.id,
        label: b.title,
        hint: `${b.author} · ${b.available_copies}/${b.total_copies} in`,
        disabled: mode === "issue" && b.available_copies === 0,
      })),
    [books, mode]
  );
  const memberOptions = useMemo(
    () => members.map((m) => ({ id: m.id, label: m.name, hint: `${m.member_number}${m.overdue_loans ? " · overdue" : ""}` })),
    [members]
  );

  const chosenBook = books.find((b) => b.id === book);
  const chosenMember = members.find((m) => m.id === member);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!book || !member) return setError("Choose both a book and a member");
    setBusy(true);
    setError("");
    try {
      if (mode === "issue") {
        const r = await api<{ loan: { due_at: string } }>("/loans", { body: { book_id: book, member_id: member } });
        onDone(`Issued "${chosenBook?.title}" to ${chosenMember?.name}. Due ${new Date(r.loan.due_at).toLocaleDateString()}.`);
      } else {
        await api("/reservations", { body: { book_id: book, member_id: member } });
        onDone(`Reserved "${chosenBook?.title}" for ${chosenMember?.name}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Modal title={mode === "issue" ? "Issue a book" : "Reserve a book"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {bookId === undefined && <Picker label="Book" options={bookOptions} value={book} onChange={setBook} placeholder="Title, author…" />}
        {bookId !== undefined && chosenBook && <p className="text-sm">Book: <strong>{chosenBook.title}</strong></p>}
        {memberId === undefined && <Picker label="Member" options={memberOptions} value={member} onChange={setMember} placeholder="Name or member number" />}
        {memberId !== undefined && chosenMember && <p className="text-sm">Member: <strong>{chosenMember.name}</strong></p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !book || !member}>{mode === "issue" ? "Issue book" : "Reserve book"}</button>
        </div>
      </form>
    </Modal>
  );
}
