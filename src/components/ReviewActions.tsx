"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Verdict = {
  recommendation: "approve" | "decline";
  confidence: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
};

// Underwriter/Admin review controls for a referred submission, with an
// advisory AI recommendation that pre-fills the note (human confirms).
export default function ReviewActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  async function getAiRecommendation() {
    setAiStatus("loading");
    setAiError("");
    try {
      const res = await fetch(`/api/submissions/${submissionId}/ai-review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI review failed");
      const v = data.verdict as Verdict;
      setVerdict(v);
      const reasonsText = v.reasons.length ? ` Reasons: ${v.reasons.join("; ")}.` : "";
      setNote(`AI recommendation: ${v.recommendation} (${v.confidence} confidence). ${v.summary}${reasonsText}`);
      setAiStatus("idle");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI review failed");
      setAiStatus("error");
    }
  }

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
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Underwriter Review
        </h2>
        <button
          type="button"
          onClick={getAiRecommendation}
          disabled={aiStatus === "loading"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {aiStatus === "loading" ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {verdict ? "Re-run AI Review" : "Get AI Recommendation"}
            </>
          )}
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        {aiError && <p className="text-xs text-red-500">{aiError}</p>}

        {verdict && (
          <div
            className={`rounded-lg border px-4 py-3 ${
              verdict.recommendation === "approve"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                AI Suggestion
              </span>
              <span
                className={`text-sm font-bold ${
                  verdict.recommendation === "approve" ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {verdict.recommendation === "approve" ? "Approve" : "Decline"}
              </span>
              <span className="text-xs text-slate-500">· {verdict.confidence} confidence</span>
            </div>
            {verdict.summary && <p className="text-sm text-slate-700">{verdict.summary}</p>}
            {verdict.reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc list-inside">
                {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Advisory only — review and confirm your decision below.
            </p>
          </div>
        )}

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
