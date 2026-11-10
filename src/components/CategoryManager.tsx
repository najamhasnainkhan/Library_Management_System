import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../api";
import Modal from "./Modal";
import type { Category } from "./BookForm";

export default function CategoryManager({
  categories,
  onClose,
  onChanged,
}: {
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/categories", { body: { name } });
      setName("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    }
  }

  async function remove(c: Category) {
    setError("");
    try {
      await api(`/categories/${c.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    }
  }

  return (
    <Modal title="Manage categories" onClose={onClose}>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={add} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="c-name" className="mb-1 block text-sm font-medium">New category</label>
          <input id="c-name" required maxLength={60} className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn">Add</button>
      </form>
      <ul className="divide-y divide-slate-100">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {c.name} <span className="text-slate-400">({c.book_count ?? 0})</span>
            </span>
            <button aria-label={`Delete category ${c.name}`} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(c)}>
              <Trash2 size={16} aria-hidden />
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="py-2 text-sm text-slate-500">No categories yet.</li>}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Deleting a category keeps its books; they become uncategorised.</p>
    </Modal>
  );
}
