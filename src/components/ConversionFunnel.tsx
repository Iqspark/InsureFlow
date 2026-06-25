// Conversion funnel (started → quoted → bound → paid), overall and grouped by
// product / broker. Dependency-free; all figures computed server-side.

export type FunnelStage = { started: number; quoted: number; bound: number; paid: number };
export type FunnelRow = { label: string } & FunnelStage;

const STAGES = [
  { key: "started", label: "Started", cls: "bg-slate-400",   text: "text-slate-600" },
  { key: "quoted",  label: "Quoted",  cls: "bg-indigo-500",  text: "text-indigo-600" },
  { key: "bound",   label: "Bound",   cls: "bg-violet-500",  text: "text-violet-600" },
  { key: "paid",    label: "Paid",    cls: "bg-emerald-500", text: "text-emerald-600" },
] as const;

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// Compact grouped table: one row per product/broker with stage counts + end-to-end %.
function GroupTable({ rows }: { rows: FunnelRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 text-left">
            <th className="font-medium pb-2 pr-2"></th>
            {STAGES.map((s) => (
              <th key={s.key} className="font-medium pb-2 px-2 text-right">{s.label}</th>
            ))}
            <th className="font-medium pb-2 pl-2 text-right">Paid&nbsp;%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const conv = pct(r.paid, r.started);
            return (
              <tr key={r.label}>
                <td className="py-2 pr-2 text-slate-700 truncate max-w-[10rem]" title={r.label}>{r.label}</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-500">{r.started}</td>
                <td className="py-2 px-2 text-right tabular-nums text-indigo-600">{r.quoted}</td>
                <td className="py-2 px-2 text-right tabular-nums text-violet-600">{r.bound}</td>
                <td className="py-2 px-2 text-right tabular-nums text-emerald-600">{r.paid}</td>
                <td className="py-2 pl-2 text-right tabular-nums font-semibold text-slate-800">{conv}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ConversionFunnel({
  overall,
  byProduct,
  byBroker,
  aside,
  byProductAside,
  byBrokerAside,
}: {
  overall: FunnelStage;
  byProduct: FunnelRow[];
  byBroker?: FunnelRow[];
  aside?: React.ReactNode;          // beside the overall funnel (e.g. Product Mix)
  byProductAside?: React.ReactNode; // beside Funnel by Product (e.g. Premium by Product)
  byBrokerAside?: React.ReactNode;  // beside Funnel by Broker (e.g. Top Brokers)
}) {
  const max = Math.max(1, overall.started);
  // Step-over-step conversion: each stage relative to the previous.
  const steps = [
    { from: "Started", to: "Quoted", rate: pct(overall.quoted, overall.started) },
    { from: "Quoted",  to: "Bound",  rate: pct(overall.bound, overall.quoted) },
    { from: "Bound",   to: "Paid",   rate: pct(overall.paid, overall.bound) },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Overall funnel — optionally beside an aside card (e.g. Product Mix) */}
      <div className={`grid grid-cols-1 gap-4 ${aside ? "lg:grid-cols-2" : ""}`}>
      <Card title="Conversion Funnel (all brokers)" subtitle="Started → Quoted → Bound → Paid">
        <div className="space-y-2.5">
          {STAGES.map((s) => {
            const val = overall[s.key];
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16 shrink-0">{s.label}</span>
                <div className="flex-1 bg-slate-100 rounded-md h-6 overflow-hidden">
                  <div
                    className={`h-full ${s.cls} rounded-md flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((val / max) * 100, val > 0 ? 6 : 0)}%` }}
                  >
                    <span className="text-[11px] font-semibold text-white">{val}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold w-12 text-right ${s.text}`}>{pct(val, max)}%</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          {steps.map((st) => (
            <span key={st.to}>
              {st.from} → {st.to}: <span className="font-semibold text-slate-700">{st.rate}%</span>
            </span>
          ))}
          <span className="ml-auto">
            End-to-end: <span className="font-semibold text-emerald-600">{pct(overall.paid, overall.started)}%</span>
          </span>
        </div>
      </Card>
      {aside}
      </div>

      {/* Grouped breakdowns */}
      <div className={`grid grid-cols-1 gap-4 ${(byBroker || byProductAside) ? "lg:grid-cols-2" : ""}`}>
        <Card title="Funnel by Product">
          <GroupTable rows={byProduct} />
        </Card>
        {byProductAside}
        {byBroker && (
          <Card title="Funnel by Broker">
            <GroupTable rows={byBroker} />
          </Card>
        )}
        {byBroker && byBrokerAside}
      </div>
    </div>
  );
}
