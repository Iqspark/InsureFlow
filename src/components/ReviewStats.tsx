// Underwriter review analytics — dependency-free, data computed server-side.

export type ReviewStatsData = {
  volumeByMonth: { label: string; approve: number; decline: number }[];
  approved: number;
  declined: number;
  approvalRate: number; // 0–100
  topReasons: { label: string; count: number }[];
  premiumAtRisk: number;
  pendingCount: number;
};

const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function ReviewStats({ stats }: { stats: ReviewStatsData }) {
  const { volumeByMonth, approved, declined, approvalRate, topReasons, premiumAtRisk, pendingCount } = stats;

  const maxMonth = Math.max(1, ...volumeByMonth.map((m) => m.approve + m.decline));
  const maxReason = Math.max(1, ...topReasons.map((r) => r.count));
  const totalDecided = approved + declined || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Decision volume — last 6 months, approve/decline stacked */}
      <Card title="Decisions (last 6 months)">
        <div className="flex items-end justify-between gap-2 h-40">
          {volumeByMonth.map((m) => {
            const tot = m.approve + m.decline;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-medium text-slate-500">{tot > 0 ? tot : ""}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: `${(tot / maxMonth) * 100}%` }}>
                  <div className="w-full bg-red-400 rounded-t-md" style={{ height: `${tot ? (m.decline / tot) * 100 : 0}%` }} title={`Declined: ${m.decline}`} />
                  <div className="w-full bg-emerald-500" style={{ height: `${tot ? (m.approve / tot) * 100 : 0}%` }} title={`Approved: ${m.approve}`} />
                </div>
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Outcomes — approval rate + split */}
      <Card title="Outcomes">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-slate-900">{approvalRate}%</span>
          <span className="text-xs text-slate-500">approval rate (approved / decided)</span>
        </div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 mb-3">
          <div className="bg-emerald-500" style={{ width: `${(approved / totalDecided) * 100}%` }} title={`Approved: ${approved}`} />
          <div className="bg-red-500" style={{ width: `${(declined / totalDecided) * 100}%` }} title={`Declined: ${declined}`} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-slate-600">Approved</span><span className="font-semibold text-emerald-600">{approved}</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-slate-600">Declined</span><span className="font-semibold text-red-600">{declined}</span></div>
        </div>
      </Card>

      {/* Top referral reasons */}
      <Card title="Top Referral Reasons (pending)">
        {topReasons.length === 0 ? (
          <p className="text-sm text-slate-400">No pending referrals.</p>
        ) : (
          <div className="space-y-2.5">
            {topReasons.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-48 truncate shrink-0" title={r.label}>{r.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-6 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Premium at risk */}
      <Card title="Pending Exposure">
        <div className="flex flex-col justify-center h-full gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Premium at risk (referred)</p>
            <p className="text-3xl font-bold text-amber-600">{cad(premiumAtRisk)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Awaiting decision</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
