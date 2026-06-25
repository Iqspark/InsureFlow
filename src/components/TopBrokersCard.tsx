// Top brokers by bound premium — a summary for the admin overview. The full
// per-broker performance table lives on the separate Brokers page.
const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

export default function TopBrokersCard({ data }: { data: { name: string; premium: number }[] }) {
  const max = Math.max(1, ...data.map((b) => b.premium));
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Top Brokers by Premium</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No bound policies yet.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((b) => (
            <div key={b.name} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-32 truncate shrink-0" title={b.name}>{b.name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(b.premium / max) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 w-16 text-right">{cad(b.premium)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
