"use client";

import { useState } from "react";

function fmtCAD(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);
}

export default function PaymentForm({
  endpoint,
  checkoutEndpoint,
  stripeEnabled = false,
  amount,
  appId,
}: {
  endpoint: string;
  checkoutEndpoint?: string;
  stripeEnabled?: boolean;
  amount: number;
  appId: string;
}) {
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [status, setStatus] = useState<"idle" | "paying" | "paid" | "error">("idle");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleStripeCheckout() {
    setStatus("paying");
    setError("");
    try {
      const res = await fetch(checkoutEndpoint!, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setStatus("error");
    }
  }

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setStatus("paying");
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNumber, expiry, cvc, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      setPreviewUrl(data.previewUrl ?? null);
      setStatus("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setStatus("error");
    }
  }

  if (status === "paid") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Payment successful</h2>
        <p className="text-sm text-slate-500 mb-1">{fmtCAD(amount)} paid for policy {appId}.</p>
        <p className="text-sm text-slate-500 mb-6">A confirmation and receipt have been emailed to you.</p>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 text-sm transition-colors">
            Open receipt email
          </a>
        )}
      </div>
    );
  }

  if (stripeEnabled && checkoutEndpoint) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <p className="text-sm text-indigo-100">Amount due for policy {appId}</p>
          <p className="text-3xl font-bold">{fmtCAD(amount)}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            You&apos;ll be taken to our secure payment page to complete your payment by card.
          </p>
          <button
            type="button"
            onClick={handleStripeCheckout}
            disabled={status === "paying"}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {status === "paying" ? "Redirecting…" : `Pay ${fmtCAD(amount)} securely`}
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment powered by Stripe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePay} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
        <p className="text-sm text-indigo-100">Amount due for policy {appId}</p>
        <p className="text-3xl font-bold">{fmtCAD(amount)}</p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name on Card</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="John Smith"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Card Number</label>
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            required
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Expiry</label>
            <input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              required
              inputMode="numeric"
              placeholder="MM/YY"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">CVC</label>
            <input
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
              inputMode="numeric"
              placeholder="123"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "paying"}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {status === "paying" ? "Processing…" : `Pay ${fmtCAD(amount)}`}
        </button>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Demo checkout — no real card is charged.
        </p>
      </div>
    </form>
  );
}
