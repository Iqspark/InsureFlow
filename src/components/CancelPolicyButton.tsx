"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Cancels a bound policy mid-term (owning broker or admin). Asks for an
// optional reason, records the cancellation, emails the customer, and shows
// a link to the sent confirmation (Ethereal preview in demo mode).
export default function CancelPolicyButton({
  submissionId,
  alreadyCancelled = false,
}: {
  submissionId: string;
  alreadyCancelled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

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
      setSentTo(data.sentTo ?? "");
      setPreviewUrl(data.previewUrl ?? undefined);
      setStatus("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
      setStatus("error");
    }
  }

  // ── Success — cancellation recorded + email sent ──────────────
  if (status === "done") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl w-full">
        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">Policy cancelled</p>
          <p className="text-xs text-red-700 mt-0.5">
            A cancellation confirmation was emailed to{" "}
            <span className="font-medium">{sentTo || "the customer"}</span>.
          </p>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-700 hover:text-red-800 underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Open cancellation email
            </a>
          )}
        </div>
      </div>
    );
  }

  // Already cancelled (page shows the notice) — nothing to render here.
  if (alreadyCancelled) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 shadow-xs transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Cancel Policy
      </button>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-red-200 shadow-xs p-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">Cancel this policy?</p>
      <p className="text-xs text-slate-500 mb-3">
        This records a mid-term cancellation and emails the customer a confirmation. A short-rate refund may apply, calculated by your broker.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for cancellation (optional) — e.g. property sold, replaced elsewhere."
        rows={2}
        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-hidden transition text-sm resize-none mb-3"
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
