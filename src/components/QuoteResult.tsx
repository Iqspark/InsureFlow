"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";
import { FactorBreakdown } from "@/types";

export default function QuoteResult() {
  const { quoteDetails, answers, restart } = useQuote();

  if (!quoteDetails) return null;

  const { decision } = quoteDetails;

  if (decision === "decline") return <DeclineResult reasons={quoteDetails.declineReasons} onRestart={restart} />;
  if (decision === "refer")   return <ReferResult reasons={quoteDetails.referralReasons} email={answers.contact_email?.displayValue as string} onRestart={restart} />;
  return <AcceptResult quoteDetails={quoteDetails} onRestart={restart} />;
}

// ── ACCEPT ───────────────────────────────────────────────────
type BuyStatus = "idle" | "sending" | "sent" | "error";

function AcceptResult({
  quoteDetails,
  onRestart,
}: {
  quoteDetails: NonNullable<ReturnType<typeof useQuote>["quoteDetails"]>;
  onRestart: () => void;
}) {
  const router  = useRouter();
  const { submissionId, answers } = useQuote();
  const { finalAnnualPremium, finalMonthlyPremium, coverageAmount, deductible, factors, basePremium } = quoteDetails;

  const [buyStatus, setBuyStatus] = useState<BuyStatus>("idle");
  const [sentEmail, setSentEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [underwriterNotified, setUnderwriterNotified] = useState(false);

  // Mirror submissionId in a ref so the async handler always reads the latest value
  const submissionIdRef = useRef(submissionId);
  useEffect(() => { submissionIdRef.current = submissionId; }, [submissionId]);

  const applicantEmail = (answers.contact_email?.displayValue ?? answers.contact_email?.value ?? "") as string;

  async function handleBuyPolicy() {
    setBuyStatus("sending");

    // Wait up to 3 s for the background DB save to complete
    if (!submissionIdRef.current) {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (submissionIdRef.current) break;
      }
    }

    if (!submissionIdRef.current) {
      setBuyStatus("error");
      return;
    }

    try {
      const res  = await fetch("/api/buy-policy", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ submissionId: submissionIdRef.current }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to send email");

      setSentEmail(data.sentTo ?? applicantEmail);
      setPreviewUrl(data.previewUrl ?? undefined);
      setUnderwriterNotified(Boolean(data.underwriterNotified));
      setBuyStatus("sent");
    } catch {
      setBuyStatus("error");
    }
  }

  // ── Success screen (full replacement, no overlay) ───────────
  if (buyStatus === "sent") {
    return (
      <motion.div
        key="success-screen"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col h-full bg-white"
      >
        {/* Top accent bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-t-2xl" />

        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
          {/* Checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-7"
          >
            <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <motion.path
                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: 0.2 }}
              />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full max-w-xs"
          >
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Policy Confirmed!</h2>
            <p className="text-slate-400 text-sm mb-6">Your policy is now bound{underwriterNotified ? " and the underwriting team has been notified" : ""}.</p>

            {/* Email chip */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6 text-left">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Confirmation sent to</p>
              <p className="text-sm font-semibold text-indigo-600 break-all">{sentEmail}</p>
            </div>

            {/* Open email button — only shown in Ethereal/test mode */}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 mb-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Open confirmation email
              </a>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              Go to Dashboard →
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col h-full overflow-y-auto"
    >
      {/* ── Quote content ──────────────────────────────────── */}
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-6 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-indigo-200 text-sm font-medium mb-1">
            ✅ Your Quote is Ready
          </p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              ${finalMonthlyPremium.toLocaleString()}
            </h1>
            <span className="text-lg font-medium text-indigo-200">CAD / mo</span>
          </div>
          <p className="text-indigo-200 text-sm mt-0.5">
            ${finalAnnualPremium.toLocaleString()} CAD billed annually
          </p>

          <div className="flex gap-3 mt-5 flex-wrap">
            <Pill label="Coverage"   value={`$${(coverageAmount / 1000).toFixed(0)}k CAD`} />
            <Pill label="Deductible" value={`$${deductible.toLocaleString()} CAD`} />
            <Pill label="Term"       value="12 months" />
          </div>
        </motion.div>
      </div>

      {/* Breakdown */}
      <div className="px-5 py-5 space-y-3 flex-1">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          How we calculated this
        </h2>

        <FactorRow
          name="Base premium"
          value={`$${basePremium.toLocaleString()}`}
          description="Starting point for this policy"
          i={0}
        />

        {factors
          .filter((f) => f.multiplier !== 1 || f.adjustment === 0)
          .map((f, i) => (
            <FactorRow
              key={f.name}
              name={f.name}
              value={
                f.adjustment > 0
                  ? `+$${f.adjustment.toLocaleString()}`
                  : f.multiplier === 1
                  ? "—"
                  : f.multiplier > 1
                  ? `+${Math.round((f.multiplier - 1) * 100)}%`
                  : `${Math.round((f.multiplier - 1) * 100)}%`
              }
              description={f.description}
              positive={f.multiplier < 1}
              negative={f.multiplier > 1 || f.adjustment > 0}
              i={i + 1}
            />
          ))}

        {/* CTA */}
        <div className="pt-4 space-y-3">
          {buyStatus === "error" && (
            <p className="text-xs text-red-500 text-center">
              Failed to send email. Please try again or contact support.
            </p>
          )}

          <button
            type="button"
            onClick={handleBuyPolicy}
            disabled={buyStatus === "sending"}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {buyStatus === "sending" ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending confirmation…
              </>
            ) : (
              "Buy This Policy →"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            disabled={buyStatus === "sending"}
            className="w-full py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl font-semibold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            Save as Quote
          </button>
          <p className="text-[11px] text-slate-400 text-center -mt-1">
            Your quote is saved either way. &ldquo;Buy&rdquo; binds it as a policy and emails confirmation.
          </p>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Get another quote
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── DECLINE ──────────────────────────────────────────────────
function DeclineResult({
  reasons,
  onRestart,
}: {
  reasons: string[];
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full justify-between p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-10">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl">
          😔
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            We're unable to offer coverage
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
            Based on the information provided, this property falls outside our
            current underwriting guidelines. Here's why:
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2 text-left">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700"
            >
              {r}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 max-w-xs">
          If you believe this is an error or your circumstances have changed,
          please contact us directly at{" "}
          <span className="text-indigo-500">support@insureflow.com</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="w-full py-3 border-2 border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-all"
      >
        Try a different property
      </button>
    </motion.div>
  );
}

// ── REFER ────────────────────────────────────────────────────
function ReferResult({
  reasons,
  email,
  onRestart,
}: {
  reasons: string[];
  email: string;
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full justify-between p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-10">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
          👋
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            A specialist will be in touch
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
            Your property has a few characteristics that need a quick review by
            one of our experienced underwriters. No worries — this is very
            common.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 w-full max-w-sm text-left space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            What happens next:
          </p>
          <ul className="text-sm text-amber-700 space-y-1.5 list-none">
            <li>✉️ We&apos;ll email you at <strong>{email || "the address provided"}</strong></li>
            <li>📞 A broker will call within 1 business day</li>
            <li>🤝 We&apos;ll work to find a solution for your property</li>
          </ul>
        </div>
        {reasons.length > 0 && (
          <details className="w-full max-w-sm text-left">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
              Why was this referred?
            </summary>
            <div className="mt-2 space-y-1.5">
              {reasons.map((r, i) => (
                <p key={i} className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  {r}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="w-full py-3 border-2 border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-all"
      >
        Get a quote for a different property
      </button>
    </motion.div>
  );
}

// ── SHARED ────────────────────────────────────────────────────
function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
      <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function FactorRow({
  name,
  value,
  description,
  positive,
  negative,
  i,
}: {
  name: string;
  value: string;
  description: string;
  positive?: boolean;
  negative?: boolean;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + i * 0.04 }}
      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100"
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">{name}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <span
        className={`text-sm font-bold ${
          positive ? "text-emerald-600" : negative ? "text-rose-500" : "text-slate-500"
        }`}
      >
        {value}
      </span>
    </motion.div>
  );
}

// Suppress unused import warning — FactorBreakdown is used by the parent engine
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _FB = FactorBreakdown;
