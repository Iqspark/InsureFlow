"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OFFLINE_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/paymentMethods";

// Broker records a payment received outside the online checkout (cash, cheque,
// EFT, pre-authorized debit, etc.) and marks the policy paid.
export default function RecordPaymentButton({
  submissionId,
  defaultAmount,
}: {
  submissionId: string;
  defaultAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>("cheque");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amount: amount ? Number(amount) : undefined,
          reference: reference.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStatus("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm font-medium text-emerald-700">Payment recorded.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs transition-colors text-sm"
      >
        Record payment
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full sm:w-72 space-y-2.5 bg-white border border-slate-200 rounded-xl p-3 text-left">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {OFFLINE_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (CAD)</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Reference (optional)</label>
        <input
          type="text"
          maxLength={120}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Cheque #, transfer ref…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-lg text-sm"
        >
          {status === "saving" ? "Recording…" : "Confirm payment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
