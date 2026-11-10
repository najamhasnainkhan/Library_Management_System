const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-indigo-50 text-indigo-700",
};

export default function Badge({ tone = "slate", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
