import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { api } from "../api";
import { useAuth, type Role } from "../auth";

interface Staff {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export default function StaffPage() {
  const { user: me } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "librarian" as Role });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ users: Staff[] }>("/users")
      .then((r) => setStaff(r.users))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/users", { body: form });
      setForm({ name: "", email: "", password: "", role: "librarian" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add account");
    } finally {
      setBusy(false);
    }
  }

  async function update(id: number, patch: Partial<Pick<Staff, "active" | "role">>) {
    setError("");
    try {
      await api(`/users/${id}`, { method: "PATCH", body: patch });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Staff accounts</h1>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div>
          <label htmlFor="s-name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="s-name" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="s-email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-pw" className="mb-1 block text-sm font-medium">Password (8+ chars)</label>
          <input id="s-pw" type="password" required minLength={8} autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-role" className="mb-1 block text-sm font-medium">Role</label>
          <select id="s-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="librarian">Librarian</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <button className="btn" disabled={busy}>
          <UserPlus size={16} aria-hidden /> Add staff
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3 capitalize">{s.role}</td>
                <td className="p-3">{s.active ? "Active" : "Deactivated"}</td>
                <td className="p-3">
                  {s.id === me?.id ? (
                    <span className="text-xs text-slate-400">You</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => update(s.id, { active: !s.active })}>
                        {s.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button className="btn-secondary" onClick={() => update(s.id, { role: s.role === "admin" ? "librarian" : "admin" })}>
                        Make {s.role === "admin" ? "librarian" : "admin"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
