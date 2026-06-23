"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Cancels a bound policy mid-term (owning broker or admin). Asks for an
// optional reason inline, then records the cancellation.
export default function CancelPolicyButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function cancel() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/submissions/${submissionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cancellation failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 shadow-sm transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Cancel Policy
      </button>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-red-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">Cancel this policy?</p>
      <p className="text-xs text-slate-500 mb-3">
        This records a mid-term cancellation. A short-rate refund may apply, calculated by your broker.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for cancellation (optional) — e.g. property sold, replaced elsewhere."
        rows={2}
        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none transition text-sm resize-none mb-3"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={cancel}
          disabled={status === "saving"}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {status === "saving" ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus("idle"); setError(""); }}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg border border-slate-200 text-sm transition-colors"
        >
          Keep policy
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
