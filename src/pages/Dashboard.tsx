import { useEffect, useState } from "react";
import { AlertTriangle, BadgeDollarSign, BookCheck, BookCopy, BookMarked, Bookmark, Users, type LucideIcon } from "lucide-react";
import { api } from "../api";

interface Stats {
  totalBooks: number;
  bookTitles: number;
  availableBooks: number;
  borrowedBooks: number;
  members: number;
  overdue: number;
  reservations: number;
  unpaidFines: number;
  recentLoans: { id: number; title: string; member: string; issued_at: string; due_at: string; returned_at: string | null }[];
}

function Card({ label, value, hint, icon: Icon, tone }: { label: string; value: number; hint?: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`rounded-lg p-3 ${tone}`}>
        <Icon size={22} aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

const fmt = (s: string) => new Date(s).toLocaleDateString();

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stats>("/dashboard")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>;
  if (!stats) return <p className="text-slate-500">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card label="Total books" value={stats.totalBooks} hint={`${stats.bookTitles} titles`} icon={BookCopy} tone="bg-indigo-100 text-indigo-700" />
        <Card label="Available" value={stats.availableBooks} icon={BookCheck} tone="bg-emerald-100 text-emerald-700" />
        <Card label="Borrowed" value={stats.borrowedBooks} icon={BookMarked} tone="bg-sky-100 text-sky-700" />
        <Card label="Members" value={stats.members} icon={Users} tone="bg-violet-100 text-violet-700" />
        <Card label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="bg-red-100 text-red-700" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card label="Active reservations" value={stats.reservations} icon={Bookmark} tone="bg-amber-100 text-amber-700" />
        <div className="card flex items-center gap-4 p-4">
          <div className="rounded-lg bg-red-100 p-3 text-red-700">
            <BadgeDollarSign size={22} aria-hidden />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.unpaidFines.toFixed(2)}</p>
            <p className="text-sm text-slate-600">Unpaid fines</p>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-200 p-4 font-semibold">Recent loans</h2>
        {stats.recentLoans.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No loans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3">Book</th>
                  <th className="p-3">Member</th>
                  <th className="p-3">Issued</th>
                  <th className="p-3">Due</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLoans.map((l) => {
                  const late = !l.returned_at && new Date(l.due_at) < new Date();
                  return (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{l.title}</td>
                      <td className="p-3">{l.member}</td>
                      <td className="p-3">{fmt(l.issued_at)}</td>
                      <td className="p-3">{fmt(l.due_at)}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${l.returned_at ? "bg-slate-100 text-slate-600" : late ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {l.returned_at ? "Returned" : late ? "Overdue" : "On loan"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
