// Underwriting-outcome feedback loop: flags products whose decline / referral
// rates deviate from the portfolio, hinting that rating factors or UW rules may
// need tuning. (A true loss ratio needs claims data, which isn't tracked yet.)

export type ProductSignal = {
  product: string;
  completed: number;   // non-draft submissions with a decision
  acceptRate: number;  // %
  declineRate: number; // %
  referRate: number;   // %
  flags: { kind: "decline" | "refer"; severity: "warn" | "high"; message: string }[];
};

const SEVERITY = {
  high: { dot: "bg-red-500",   chip: "bg-red-50 text-red-700 border-red-200" },
  warn: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" },
} as const;

function MiniBar({ accept, decline, refer }: { accept: number; decline: number; refer: number }) {
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100" title={`Accept ${accept}% · Refer ${refer}% · Decline ${decline}%`}>
      <div className="bg-emerald-500" style={{ width: `${accept}%` }} />
      <div className="bg-amber-500" style={{ width: `${refer}%` }} />
      <div className="bg-red-500" style={{ width: `${decline}%` }} />
    </div>
  );
}

export default function ProductSignals({
  signals,
  portfolio,
}: {
  signals: ProductSignal[];
  portfolio: { declineRate: number; referRate: number };
}) {
  const flagged = signals.filter((s) => s.flags.length > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Underwriting Signals</h3>
        <span className="text-[11px] text-slate-400">
          Portfolio: <span className="text-amber-600 font-medium">{portfolio.referRate}%</span> refer ·{" "}
          <span className="text-red-600 font-medium">{portfolio.declineRate}%</span> decline
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mb-4">
        Decline / referral mix vs. the portfolio average — a proxy for whether rating factors or UW rules need tuning.
      </p>

      {signals.length === 0 ? (
        <p className="text-sm text-slate-400">Not enough completed quotes yet.</p>
      ) : (
        <>
          {flagged.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {flagged.flatMap((s) =>
                s.flags.map((f, i) => (
                  <div key={`${s.product}-${i}`} className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2 ${SEVERITY[f.severity].chip}`}>
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY[f.severity].dot}`} />
                    <span><span className="font-semibold">{s.product}:</span> {f.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="space-y-2.5">
            {signals.map((s) => (
              <div key={s.product} className="flex items-center gap-3">
                <div className="w-44 shrink-0 min-w-0">
                  <p className="text-xs text-slate-700 truncate" title={s.product}>{s.product}</p>
                  <p className="text-[10px] text-slate-400">{s.completed} quote{s.completed === 1 ? "" : "s"}</p>
                </div>
                <div className="flex-1 min-w-0"><MiniBar accept={s.acceptRate} decline={s.declineRate} refer={s.referRate} /></div>
                <span className="text-xs font-semibold text-slate-700 w-10 text-right tabular-nums">{s.acceptRate}%</span>
                {s.flags.length > 0 ? (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY[s.flags.some((f) => f.severity === "high") ? "high" : "warn"].dot}`} />
                ) : (
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" title="Healthy" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Accept</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Refer</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Decline</span>
          </div>
        </>
      )}
    </div>
  );
}
