"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MS_DAY = 86_400_000;
const cad = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

// Mid-term adjustment (MTA): revise the sum insured on a bound policy. Shows a
// live pro-rata estimate, then applies it and emails the customer.
export default function AdjustPolicyButton({
  submissionId,
  currentCoverage,
  currentAnnual,
  effectiveAt,
  expiresAt,
}: {
  submissionId: string;
  currentCoverage: number;
  currentAnnual: number;
  effectiveAt: string | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverage, setCoverage] = useState(String(currentCoverage || ""));
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [applied, setApplied] = useState<{ newAnnual: number; proRata: number } | null>(null);

  // Live pro-rata preview.
  const newCov = Number(coverage);
  const now = Date.now();
  const eff = effectiveAt ? new Date(effectiveAt).getTime() : now - 30 * MS_DAY;
  const exp = expiresAt ? new Date(expiresAt).getTime() : eff + 365 * MS_DAY;
  const termDays = Math.max(1, Math.round((exp - eff) / MS_DAY));
  const remainingDays = Math.max(0, Math.round((exp - now) / MS_DAY));
  const valid = newCov > 0 && currentCoverage > 0 && currentAnnual > 0 && Math.round(newCov) !== Math.round(currentCoverage);
  const newAnnual = valid ? Math.round((currentAnnual * newCov) / currentCoverage) : currentAnnual;
  const proRata = valid ? Math.round(((newAnnual - currentAnnual) * remainingDays) / termDays) : 0;
  const isAP = proRata >= 0;

  async function apply() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/submissions/${submissionId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverageAmount: newCov, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Adjustment failed");
      setApplied({ newAnnual: data.newAnnual, proRata: data.proRata });
      setSentTo(data.sentTo ?? "");
      setPreviewUrl(data.previewUrl ?? undefined);
      setStatus("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed");
      setStatus("error");
    }
  }

  if (status === "done" && applied) {
    const ap = applied.proRata >= 0;
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl w-full">
        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-800">Policy adjusted</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            New annual premium <span className="font-semibold">{cad(applied.newAnnual)}</span> ·{" "}
            {ap ? "additional premium" : "return premium"}{" "}
            <span className="font-semibold">{cad(Math.abs(applied.proRata))}</span> (pro-rata).
            A confirmation was emailed to <span className="font-medium">{sentTo || "the customer"}</span>.
          </p>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Open adjustment email
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 font-medium rounded-xl border border-indigo-200 shadow-sm transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Adjust Policy
      </button>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-indigo-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">Mid-term adjustment</p>
      <p className="text-xs text-slate-500 mb-3">
        Revise the sum insured. The premium is recalculated and the difference is charged or returned pro-rata for the {remainingDays} days remaining.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">New coverage amount (CAD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
              min={1}
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Current: {cad(currentCoverage)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. renovation increased value"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
          />
        </div>
      </div>

      {/* Live estimate */}
      {valid && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-3 text-xs">
          <span className="text-slate-500">Annual premium <span className="font-semibold text-slate-700">{cad(currentAnnual)} → {cad(newAnnual)}</span></span>
          <span className="text-slate-300">·</span>
          <span className={isAP ? "text-amber-700" : "text-emerald-700"}>
            {isAP ? "Additional premium" : "Return premium"} <span className="font-semibold">{cad(Math.abs(proRata))}</span> for {remainingDays}d
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={!valid || status === "saving"}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
        >
          {status === "saving" ? "Applying…" : "Confirm adjustment"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus("idle"); setError(""); setCoverage(String(currentCoverage || "")); }}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg border border-slate-200 text-sm transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
