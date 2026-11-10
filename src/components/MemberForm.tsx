import { useState, type FormEvent } from "react";
import { api } from "../api";
import Modal from "./Modal";

export interface Member {
  id: number;
  member_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  notes?: string | null;
  status: "active" | "suspended";
  joined_at: string;
  active_loans: number;
  overdue_loans: number;
  unpaid_fines?: number;
}

export default function MemberForm({
  member,
  onClose,
  onSaved,
}: {
  member: Member | null;
  onClose: () => void;
  onSaved: (m: Member) => void;
}) {
  const [f, setF] = useState({
    name: member?.name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    notes: member?.notes ?? "",
    status: member?.status ?? "active",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = member
        ? await api<{ member: Member }>(`/members/${member.id}`, { method: "PUT", body: f })
        : await api<{ member: Member }>("/members", { body: f });
      onSaved(r.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={member ? "Edit member" : "Register member"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="m-name" className="mb-1 block text-sm font-medium">Full name</label>
          <input id="m-name" required className="input" value={f.name} onChange={set("name")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="m-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="m-email" type="email" className="input" value={f.email} onChange={set("email")} />
          </div>
          <div>
            <label htmlFor="m-phone" className="mb-1 block text-sm font-medium">Phone</label>
            <input id="m-phone" type="tel" className="input" value={f.phone} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <label htmlFor="m-address" className="mb-1 block text-sm font-medium">Address</label>
          <input id="m-address" className="input" value={f.address} onChange={set("address")} />
        </div>
        <div>
          <label htmlFor="m-notes" className="mb-1 block text-sm font-medium">Notes</label>
          <textarea id="m-notes" rows={2} className="input" value={f.notes} onChange={set("notes")} />
        </div>
        {member && (
          <div>
            <label htmlFor="m-status" className="mb-1 block text-sm font-medium">Status</label>
            <select id="m-status" className="input" value={f.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : member ? "Save changes" : "Register"}</button>
        </div>
      </form>
    </Modal>
  );
}
