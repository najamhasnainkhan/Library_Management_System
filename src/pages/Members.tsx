import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { api } from "../api";
import Badge from "../components/Badge";
import MemberForm, { type Member } from "../components/MemberForm";

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    return api<{ members: Member[] }>(`/members?${params}`)
      .then((r) => {
        setMembers(r.members);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Members</h1>
        <button className="btn" onClick={() => setCreating(true)}>
          <UserPlus size={16} aria-hidden /> Register member
        </button>
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="mb-q" className="mb-1 block text-sm font-medium">Search</label>
          <div className="relative">
            <Search size={16} aria-hidden className="absolute left-3 top-2.5 text-slate-400" />
            <input id="mb-q" type="search" className="input pl-9" placeholder="Name, member number, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="mb-st" className="mb-1 block text-sm font-medium">Status</label>
          <select id="mb-st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Library members</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="p-3">Member</th>
              <th scope="col" className="p-3">Contact</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Books out</th>
              <th scope="col" className="p-3">Unpaid fines</th>
              <th scope="col" className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link to={`/members/${m.id}`} className="font-medium text-brand-700 hover:underline">{m.name}</Link>
                  <div className="font-mono text-xs text-slate-500">{m.member_number}</div>
                </td>
                <td className="p-3">
                  <div>{m.email || "—"}</div>
                  <div className="text-xs text-slate-500">{m.phone}</div>
                </td>
                <td className="p-3">
                  <Badge tone={m.status === "active" ? "green" : "amber"}>{m.status === "active" ? "Active" : "Suspended"}</Badge>
                </td>
                <td className="p-3">
                  {m.active_loans}
                  {m.overdue_loans > 0 && <span className="ml-2"><Badge tone="red">{m.overdue_loans} overdue</Badge></span>}
                </td>
                <td className="p-3">
                  {m.unpaid_fines ? <span className="font-medium text-red-700">{m.unpaid_fines.toFixed(2)}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="p-3">{new Date(m.joined_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No members match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">{members.length} member{members.length === 1 ? "" : "s"} shown</p>

      {creating && (
        <MemberForm
          member={null}
          onClose={() => setCreating(false)}
          onSaved={(m) => {
            setCreating(false);
            navigate(`/members/${m.id}`);
          }}
        />
      )}
    </div>
  );
}
