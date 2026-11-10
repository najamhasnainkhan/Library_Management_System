import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookPlus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { api } from "../api";
import Badge from "../components/Badge";
import CheckoutModal from "../components/CheckoutModal";

export interface Loan {
  id: number;
  book_id: number;
  member_id: number;
  title: string;
  author: string;
  member_name: string;
  member_number: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  renewals: number;
  state: "returned" | "overdue" | "borrowed";
  days_late: number;
  fine: number;
  fine_paid: boolean;
}
interface Rules {
  loan_days: number;
  max_renewals: number;
  fine_per_day: number;
}

const fmt = (d: string) => new Date(d).toLocaleDateString();
export const money = (n: number) => n.toFixed(2);

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [state, setState] = useState("open");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ state });
    if (q.trim()) params.set("q", q.trim());
    return api<{ loans: Loan[]; rules: Rules }>(`/loans?${params}`)
      .then((r) => {
        setLoans(r.loans);
        setRules(r.rules);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [state, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function act(l: Loan, action: "return" | "renew") {
    setBusyId(l.id);
    setError("");
    setNotice("");
    try {
      const r = await api<{ loan: Loan; fine?: number }>(`/loans/${l.id}/${action}`, { method: "POST", body: {} });
      if (action === "return") {
        setNotice(
          r.fine && r.fine > 0
            ? `"${l.title}" returned. Late fine of ${money(r.fine)} added to ${l.member_name}'s balance.`
            : `"${l.title}" returned on time.`
        );
      } else {
        setNotice(`"${l.title}" renewed. New due date ${fmt(r.loan.due_at)}.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Loans</h1>
        <button className="btn" onClick={() => setIssuing(true)}>
          <BookPlus size={16} aria-hidden /> Issue a book
        </button>
      </div>
      {rules && (
        <p className="text-sm text-slate-600">
          Loans last {rules.loan_days} days, can be renewed {rules.max_renewals} times, and late returns cost {money(rules.fine_per_day)} per day.
        </p>
      )}

      <div className="card grid gap-3 p-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="ln-q" className="mb-1 block text-sm font-medium">Search</label>
          <div className="relative">
            <Search size={16} aria-hidden className="absolute left-3 top-2.5 text-slate-400" />
            <input id="ln-q" type="search" className="input pl-9" placeholder="Book, ISBN, member or member number" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="ln-st" className="mb-1 block text-sm font-medium">Show</label>
          <select id="ln-st" className="input" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="open">On loan now</option>
            <option value="overdue">Overdue only</option>
            <option value="returned">Returned</option>
            <option value="all">All loans</option>
          </select>
        </div>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Loans</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="p-3">Book</th>
              <th scope="col" className="p-3">Member</th>
              <th scope="col" className="p-3">Issued</th>
              <th scope="col" className="p-3">Due</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Fine</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-slate-500">{l.author}</div>
                </td>
                <td className="p-3">
                  <Link to={`/members/${l.member_id}`} className="text-brand-700 hover:underline">{l.member_name}</Link>
                  <div className="font-mono text-xs text-slate-500">{l.member_number}</div>
                </td>
                <td className="p-3">{fmt(l.issued_at)}</td>
                <td className="p-3">
                  {fmt(l.due_at)}
                  {l.renewals > 0 && <div className="text-xs text-slate-500">Renewed {l.renewals}×</div>}
                </td>
                <td className="p-3">
                  {l.state === "returned" ? (
                    <Badge tone="slate">Returned {fmt(l.returned_at!)}</Badge>
                  ) : l.state === "overdue" ? (
                    <Badge tone="red">Overdue {l.days_late} day{l.days_late === 1 ? "" : "s"}</Badge>
                  ) : (
                    <Badge tone="blue">On loan</Badge>
                  )}
                </td>
                <td className="p-3">
                  {l.fine > 0 ? (
                    <span className={l.fine_paid ? "text-slate-500" : "font-medium text-red-700"}>
                      {money(l.fine)} {l.fine_paid ? "(paid)" : l.returned_at ? "" : "(accruing)"}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="p-3">
                  {!l.returned_at && (
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-secondary"
                        disabled={busyId === l.id || l.state === "overdue" || l.renewals >= (rules?.max_renewals ?? 2)}
                        onClick={() => act(l, "renew")}
                        aria-label={`Renew ${l.title} for ${l.member_name}`}
                      >
                        <RefreshCw size={14} aria-hidden /> Renew
                      </button>
                      <button className="btn-secondary" disabled={busyId === l.id} onClick={() => act(l, "return")} aria-label={`Return ${l.title} from ${l.member_name}`}>
                        <RotateCcw size={14} aria-hidden /> Return
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && loans.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">No loans to show.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">{loans.length} loan{loans.length === 1 ? "" : "s"} shown</p>

      {issuing && (
        <CheckoutModal
          mode="issue"
          onClose={() => setIssuing(false)}
          onDone={(m) => {
            setIssuing(false);
            setNotice(m);
            load();
          }}
        />
      )}
    </div>
  );
}
