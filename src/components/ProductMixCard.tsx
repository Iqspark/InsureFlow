// Product mix bar list. Extracted from AdminAnalytics so it can sit beside the
// conversion funnel on the admin overview.
export default function ProductMixCard({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((p) => p.count));
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Product Mix</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No quotes yet.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-44 truncate shrink-0" title={p.label}>{p.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.count / max) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-6 text-right">{p.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
