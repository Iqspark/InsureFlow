// Portfolio-wide analytics for Admin — dependency-free, data computed server-side.

export type AdminStats = {
  premiumByMonth: { label: string; total: number }[];
  decisionSplit: { accept: number; decline: number; refer: number };
  acceptanceRate: number; // 0–100
  productMix: { label: string; count: number }[];
  topBrokers: { name: string; premium: number }[];
};

const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminAnalytics({ stats }: { stats: AdminStats }) {
  const { premiumByMonth, decisionSplit, acceptanceRate, productMix, topBrokers } = stats;

  const maxMonth = Math.max(1, ...premiumByMonth.map((m) => m.total));
  const maxProduct = Math.max(1, ...productMix.map((p) => p.count));
  const maxBroker = Math.max(1, ...topBrokers.map((b) => b.premium));
  const totalDecisions = decisionSplit.accept + decisionSplit.decline + decisionSplit.refer || 1;

  const seg = [
    { key: "Accepted", val: decisionSplit.accept, cls: "bg-emerald-500", text: "text-emerald-600" },
    { key: "Referred", val: decisionSplit.refer, cls: "bg-amber-500", text: "text-amber-600" },
    { key: "Declined", val: decisionSplit.decline, cls: "bg-red-500", text: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Premium volume — last 6 months (all brokers) */}
      <Card title="Premium Volume (last 6 months)">
        <div className="flex items-end justify-between gap-2 h-40">
          {premiumByMonth.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-medium text-slate-500">{m.total > 0 ? `$${Math.round(m.total / 1000)}k` : ""}</span>
              <div className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 min-h-[2px]" style={{ height: `${(m.total / maxMonth) * 100}%` }} title={cad(m.total)} />
              <span className="text-[10px] text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Decision split (all brokers) */}
      <Card title="Decisions (all brokers)">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-slate-900">{acceptanceRate}%</span>
          <span className="text-xs text-slate-500">acceptance rate</span>
        </div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 mb-3">
          {seg.map((s) => (
            <div key={s.key} className={s.cls} style={{ width: `${(s.val / totalDecisions) * 100}%` }} title={`${s.key}: ${s.val}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {seg.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.cls}`} />
              <span className="text-slate-600">{s.key}</span>
              <span className={`font-semibold ${s.text}`}>{s.val}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Product mix */}
      <Card title="Product Mix">
        {productMix.length === 0 ? (
          <p className="text-sm text-slate-400">No quotes yet.</p>
        ) : (
          <div className="space-y-2.5">
            {productMix.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 truncate shrink-0" title={p.label}>{p.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.count / maxProduct) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-6 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top brokers by bound premium */}
      <Card title="Top Brokers by Premium">
        {topBrokers.length === 0 ? (
          <p className="text-sm text-slate-400">No bound policies yet.</p>
        ) : (
          <div className="space-y-2.5">
            {topBrokers.map((b) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-32 truncate shrink-0" title={b.name}>{b.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(b.premium / maxBroker) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-emerald-600 w-16 text-right">{cad(b.premium)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
