import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, BookPlus, X } from "lucide-react";
import { api } from "../api";
import Badge from "../components/Badge";
import CheckoutModal from "../components/CheckoutModal";

interface Reservation {
  id: number;
  book_id: number;
  member_id: number;
  status: "pending" | "ready" | "fulfilled" | "cancelled";
  created_at: string;
  title: string;
  author: string;
  member_name: string;
  member_number: string;
  queue_position: number;
}

const label = { pending: "Waiting", ready: "Ready for pickup", fulfilled: "Fulfilled", cancelled: "Cancelled" } as const;
const tone = { pending: "amber", ready: "green", fulfilled: "slate", cancelled: "slate" } as const;

export default function Reservations() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [issue, setIssue] = useState<Reservation | null>(null);

  const load = useCallback(() => {
    return api<{ reservations: Reservation[] }>(`/reservations?status=${status}`)
      .then((r) => {
        setItems(r.reservations);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  async function cancel(r: Reservation) {
    setError("");
    try {
      await api(`/reservations/${r.id}/cancel`, { method: "POST", body: {} });
      setNotice(`Reservation of "${r.title}" for ${r.member_name} cancelled.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Reservations</h1>
        <button className="btn" onClick={() => setCreating(true)}>
          <BookmarkPlus size={16} aria-hidden /> Reserve a book
        </button>
      </div>
      <p className="text-sm text-slate-600">
        When a reserved book is returned, the first member in the queue is marked "Ready for pickup" and the copy is held for them.
      </p>
      <div className="card max-w-xs p-4">
        <label htmlFor="rs-st" className="mb-1 block text-sm font-medium">Show</label>
        <select id="rs-st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Reservations</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="p-3">Book</th>
              <th scope="col" className="p-3">Member</th>
              <th scope="col" className="p-3">Reserved</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.author}</div>
                </td>
                <td className="p-3">
                  <Link to={`/members/${r.member_id}`} className="text-brand-700 hover:underline">{r.member_name}</Link>
                  <div className="font-mono text-xs text-slate-500">{r.member_number}</div>
                </td>
                <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
                  {r.status === "pending" && <span className="ml-2 text-xs text-slate-500">#{r.queue_position} in queue</span>}
                </td>
                <td className="p-3">
                  {(r.status === "pending" || r.status === "ready") && (
                    <div className="flex justify-end gap-2">
                      {r.status === "ready" && (
                        <button className="btn-secondary" onClick={() => setIssue(r)} aria-label={`Issue ${r.title} to ${r.member_name}`}>
                          <BookPlus size={14} aria-hidden /> Issue
                        </button>
                      )}
                      <button className="btn-secondary" onClick={() => cancel(r)} aria-label={`Cancel reservation of ${r.title} for ${r.member_name}`}>
                        <X size={14} aria-hidden /> Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">No reservations to show.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CheckoutModal
          mode="reserve"
          onClose={() => setCreating(false)}
          onDone={(m) => {
            setCreating(false);
            setNotice(m);
            load();
          }}
        />
      )}
      {issue && (
        <CheckoutModal
          mode="issue"
          bookId={issue.book_id}
          memberId={issue.member_id}
          onClose={() => setIssue(null)}
          onDone={(m) => {
            setIssue(null);
            setNotice(m);
            load();
          }}
        />
      )}
    </div>
  );
}
