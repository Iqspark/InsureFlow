"use client";

import { useState } from "react";

export default function ProposalSignForm({ token }: { token: string }) {
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerName.trim() || !consent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposal/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), consent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Thank you — your proposal has been signed. Your broker will bind the policy and send your documents.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="signerName" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Type your full name to sign
        </label>
        <input
          id="signerName"
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Jane Doe"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
        />
        {signerName.trim() && (
          <p className="mt-2 text-2xl text-slate-800" style={{ fontFamily: "cursive" }}>
            {signerName.trim()}
          </p>
        )}
      </div>

      <label className="flex items-start gap-2.5 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          I have read and accept the declaration above, and I agree that typing my name
          constitutes my electronic signature.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !signerName.trim() || !consent}
        className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
      >
        {loading ? "Signing…" : "Sign proposal"}
      </button>
    </form>
  );
}
