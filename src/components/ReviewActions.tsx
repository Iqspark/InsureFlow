"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Underwriter/Admin review controls for a referred submission.
export default function ReviewActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(action: "approve" | "decline") {
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  const busy = status === "submitting";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Underwriter Review
        </h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-slate-600">
          This quote was referred for manual review. Approve to make it available for the
          broker to bind, or decline it.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a review note (optional) — shared with the broker on approval."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm resize-none"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => submit("approve")}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {busy ? "Saving…" : "Approve"}
          </button>
          <button
            onClick={() => submit("decline")}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 disabled:opacity-60 text-red-600 font-medium rounded-xl border border-red-200 shadow-sm transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decline
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
