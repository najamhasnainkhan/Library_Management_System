import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookPlus, Pencil, Trash2 } from "lucide-react";
import CheckoutModal from "../components/CheckoutModal";
import { api } from "../api";
import Badge from "../components/Badge";
import MemberForm, { type Member } from "../components/MemberForm";

interface LoanRow {
  id: number;
  book_id: number;
  title: string;
  author: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  renewals: number;
  fine: number;
  fine_paid: boolean;
  state: "returned" | "overdue" | "borrowed";
}

const fmt = (d: string) => new Date(d).toLocaleDateString();

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [unpaid, setUnpaid] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    api<{ member: Member; loans: LoanRow[]; unpaid_fines: number }>(`/members/${id}`)
      .then((r) => {
        setMember(r.member);
        setLoans(r.loans);
        setUnpaid(r.unpaid_fines);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function remove() {
    try {
      await api(`/members/${id}`, { method: "DELETE" });
      navigate("/members");
    } catch (err) {
      setConfirming(false);
      setError(err instanceof Error ? err.message : "Could not delete the member");
    }
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Link to="/members" className="text-sm text-brand-700 hover:underline">← Back to members</Link>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : <p className="text-slate-500">Loading…</p>}
      </div>
    );
  }

  const tone = { returned: "slate", overdue: "red", borrowed: "blue" } as const;

  return (
    <div className="space-y-5">
      <Link to="/members" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} aria-hidden /> Back to members
      </Link>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-semibold">{member.name}</h1>
          <p className="font-mono text-sm text-slate-500">{member.member_number}</p>
          <div className="mt-2 flex gap-2">
            <Badge tone={member.status === "active" ? "green" : "amber"}>{member.status === "active" ? "Active" : "Suspended"}</Badge>
            {member.overdue_loans > 0 && <Badge tone="red">{member.overdue_loans} overdue</Badge>}
            {unpaid > 0 && <Badge tone="red">{unpaid.toFixed(2)} unpaid fines</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" disabled={member.status !== "active"} onClick={() => setIssuing(true)}>
            <BookPlus size={14} aria-hidden /> Issue a book
          </button>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden /> Edit profile
          </button>
          {confirming ? (
            <>
              <span className="text-xs text-slate-600">Delete this member?</span>
              <button className="btn-secondary border-red-300 text-red-700" onClick={remove}>Yes, delete</button>
              <button className="btn-secondary" onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setConfirming(true)}>
              <Trash2 size={14} aria-hidden /> Delete
            </button>
          )}
        </div>
        <dl className="grid w-full gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-slate-500">Email</dt><dd>{member.email || "—"}</dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd>{member.phone || "—"}</dd></div>
          <div><dt className="text-slate-500">Joined</dt><dd>{fmt(member.joined_at)}</dd></div>
          <div><dt className="text-slate-500">Unpaid fines</dt><dd>{unpaid.toFixed(2)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd>{member.address || "—"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500">Notes</dt><dd>{member.notes || "—"}</dd></div>
        </dl>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Borrowing history</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Borrowing history for {member.name}</caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="p-3">Book</th>
                <th scope="col" className="p-3">Borrowed</th>
                <th scope="col" className="p-3">Due</th>
                <th scope="col" className="p-3">Returned</th>
                <th scope="col" className="p-3">Status</th>
                <th scope="col" className="p-3">Fine</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-medium">{l.title}</div>
                    <div className="text-xs text-slate-500">{l.author}</div>
                  </td>
                  <td className="p-3">{fmt(l.issued_at)}</td>
                  <td className="p-3">{fmt(l.due_at)}</td>
                  <td className="p-3">{l.returned_at ? fmt(l.returned_at) : "—"}</td>
                  <td className="p-3">
                    <Badge tone={tone[l.state]}>{l.state === "returned" ? "Returned" : l.state === "overdue" ? "Overdue" : "Borrowed"}</Badge>
                  </td>
                  <td className="p-3">
                    {l.fine > 0 ? (
                      <span className={l.fine_paid ? "text-slate-500" : "font-medium text-red-700"}>{l.fine.toFixed(2)}{l.fine_paid ? " (paid)" : ""}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">This member has not borrowed any books yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {issuing && (
        <CheckoutModal
          mode="issue"
          memberId={member.id}
          onClose={() => setIssuing(false)}
          onDone={(m) => {
            setIssuing(false);
            setNotice(m);
            load();
          }}
        />
      )}
      {editing && (
        <MemberForm
          member={member}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
