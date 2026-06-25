// Bound premium ($) per product — the revenue companion to "Funnel by Product".
const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

export default function PremiumByProductCard({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Premium by Product</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No bound premium yet.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-44 truncate shrink-0" title={p.label}>{p.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.total / max) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 w-16 text-right">{cad(p.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
