import { useId, useMemo, useState } from "react";

export interface PickerOption {
  id: number;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** A filter box above a list box: pick one option from a long list without a dropdown. */
export default function Picker({
  label,
  options,
  value,
  onChange,
  placeholder = "Type to filter",
}: {
  label: string;
  options: PickerOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const uid = useId();
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? options.filter((o) => `${o.label} ${o.hint || ""}`.toLowerCase().includes(f)) : options;
  }, [options, filter]);

  return (
    <div>
      <label htmlFor={`${uid}-f`} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={`${uid}-f`} type="search" className="input mb-2" placeholder={placeholder} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <label htmlFor={`${uid}-s`} className="sr-only">{label} list</label>
      <select
        id={`${uid}-s`}
        size={5}
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        {shown.map((o) => (
          <option key={o.id} value={o.id} disabled={o.disabled}>
            {o.label}
            {o.hint ? ` — ${o.hint}` : ""}
          </option>
        ))}
      </select>
      {shown.length === 0 && <p className="mt-1 text-xs text-slate-500">Nothing matches.</p>}
    </div>
  );
}
