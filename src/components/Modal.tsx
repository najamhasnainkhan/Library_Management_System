import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="card my-8 w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close dialog" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
