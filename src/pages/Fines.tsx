import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeDollarSign } from "lucide-react";
import { api } from "../api";
import Badge from "../components/Badge";
import { money } from "./Loans";

interface Fine {
  id: number;
  loan_id: number;
  member_id: number;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  member_name: string;
  member_number: string;
  title: string;
  due_at: string;
  returned_at: string | null;
}
interface Totals {
  unpaid: number;
  collected: number;
  members_owing: number;
}

export default function Fines() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [perDay, setPerDay] = useState(0.5);
  const [status, setStatus] = useState("unpaid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    return api<{ fines: Fine[]; totals: Totals; fine_per_day: number }>(`/fines?status=${status}`)
      .then((r) => {
        setFines(r.fines);
        setTotals(r.totals);
        setPerDay(r.fine_per_day);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  async function pay(f: Fine) {
    setError("");
    try {
      await api(`/fines/${f.id}/pay`, { method: "POST", body: {} });
      setNotice(`Recorded payment of ${money(f.amount)} from ${f.member_name}.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Fines</h1>
      <p className="text-sm text-slate-600">
        Late books cost {money(perDay)} per day after the due date. Fines on books still out keep growing until the book is returned.
      </p>

      {totals && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-2xl font-semibold text-red-700">{money(totals.unpaid)}</p>
            <p className="text-sm text-slate-600">Unpaid balance</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-semibold">{totals.members_owing}</p>
            <p className="text-sm text-slate-600">Members owing</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-semibold text-emerald-700">{money(totals.collected)}</p>
            <p className="text-sm text-slate-600">Collected</p>
          </div>
        </div>
      )}

      <div className="card max-w-xs p-4">
        <label htmlFor="fn-st" className="mb-1 block text-sm font-medium">Show</label>
        <select id="fn-st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="all">All</option>
        </select>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Fines</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="p-3">Member</th>
              <th scope="col" className="p-3">Book</th>
              <th scope="col" className="p-3">Due</th>
              <th scope="col" className="p-3">Amount</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link to={`/members/${f.member_id}`} className="text-brand-700 hover:underline">{f.member_name}</Link>
                  <div className="font-mono text-xs text-slate-500">{f.member_number}</div>
                </td>
                <td className="p-3">{f.title}</td>
                <td className="p-3">{new Date(f.due_at).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{money(f.amount)}</td>
                <td className="p-3">
                  {f.paid ? (
                    <Badge tone="green">Paid {f.paid_at ? new Date(f.paid_at).toLocaleDateString() : ""}</Badge>
                  ) : f.returned_at ? (
                    <Badge tone="red">Unpaid</Badge>
                  ) : (
                    <Badge tone="amber">Accruing — book still out</Badge>
                  )}
                </td>
                <td className="p-3">
                  {!f.paid && (
                    <div className="flex justify-end">
                      <button className="btn-secondary" disabled={!f.returned_at} title={f.returned_at ? undefined : "Return the book first"} onClick={() => pay(f)} aria-label={`Mark fine of ${money(f.amount)} for ${f.member_name} as paid`}>
                        <BadgeDollarSign size={14} aria-hidden /> Mark paid
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && fines.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No fines to show.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
