import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteDraftButton from "@/components/DeleteDraftButton";
import DeletePolicyButton from "@/components/DeletePolicyButton";
import DownloadPolicyButton from "@/components/DownloadPolicyButton";
import { buildSubmissionSections } from "@/lib/submissionSections";
import { productSlugForPolicyType } from "@/data/products";
import PropertyMap from "@/components/PropertyMap";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import BuyPolicyButton from "@/components/BuyPolicyButton";
import CancelPolicyButton from "@/components/CancelPolicyButton";
import AdjustPolicyButton from "@/components/AdjustPolicyButton";
import ReviewActions from "@/components/ReviewActions";
import { canViewSubmission, canReview, canBindOrPay, type SessionUser } from "@/lib/access";
import { policyNumber } from "@/utils/policyNumber";

// ── Helpers ──────────────────────────────────────────────────

function fmt(v: string | number | null | undefined, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DecisionBanner({ decision, reasons }: { decision: string | null; reasons: string[] }) {
  const cfg: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
    accept:  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: "✓", label: "Accepted" },
    decline: { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-800",     icon: "✕", label: "Declined" },
    refer:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   icon: "⚑", label: "Referred" },
  };
  const s = (decision ? cfg[decision] : null) ?? cfg.refer;
  return (
    <div className={`rounded-xl border px-5 py-4 ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-3 mb-1">
        <span className={`text-2xl font-bold ${s.text}`}>{s.icon}</span>
        <span className={`text-lg font-bold ${s.text}`}>{s.label}</span>
      </div>
      {reasons.length > 0 && (
        <ul className={`mt-2 space-y-1 text-sm ${s.text} opacity-80 list-disc list-inside`}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function PolicyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session!.user as unknown as SessionUser;

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      broker: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  if (!sub || !canViewSubmission(user, sub)) notFound();

  const declineReasons:  string[] = JSON.parse(sub.declineReasons  ?? "[]");
  const referralReasons: string[] = JSON.parse(sub.referralReasons ?? "[]");
  const reasons = sub.decision === "decline" ? declineReasons : referralReasons;

  const appId = policyNumber(sub);
  const sections = buildSubmissionSections(sub);
  const isOwnerOrAdmin = canBindOrPay(user, sub);

  type Adjustment = {
    at: string; oldCoverage: number; newCoverage: number;
    oldAnnual: number; newAnnual: number; proRata: number; reason: string | null;
  };
  let adjustments: Adjustment[] = [];
  try { adjustments = JSON.parse(sub.adjustments ?? "[]"); } catch { adjustments = []; }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Policy {appId}</span>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {fmt(sub.applicantName, "Unknown Applicant")}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {sub.policyType} · Application ID:{" "}
              <span className="font-mono font-semibold text-slate-700">{appId}</span>
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {sub.status !== "draft" && <StageBadge purchased={sub.purchased} decision={sub.decision} />}
              {sub.purchased && !sub.cancelledAt && <PaymentBadge paymentStatus={sub.paymentStatus} />}
              {sub.cancelledAt && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                  Cancelled
                </span>
              )}
            </div>
            {user.role !== "BROKER" && sub.broker?.name && (
              <p className="text-xs text-slate-400">Broker: {sub.broker.name}</p>
            )}
            <p className="text-xs text-slate-400">
              Submitted {fmtDate(sub.createdAt)}
            </p>
          </div>
        </div>

        {/* Decision banner */}
        <DecisionBanner decision={sub.decision} reasons={reasons} />

        {/* Payment call-to-action — bind / resend payment link (top of page) */}
        {isOwnerOrAdmin && sub.status !== "draft" && sub.decision === "accept" &&
          sub.paymentStatus !== "paid" && !sub.cancelledAt && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {sub.purchased ? "Awaiting customer payment" : "Ready to bind"}
              </p>
              <p className="text-xs text-emerald-700/80 mt-0.5">
                {sub.purchased
                  ? "This policy is bound — resend the secure payment link to the customer."
                  : "Bind this policy and email the customer a secure payment link."}
              </p>
            </div>
            <div className="shrink-0">
              <BuyPolicyButton submissionId={sub.id} purchased={sub.purchased} />
            </div>
          </div>
        )}

        {/* Underwriter review controls (referred quotes) */}
        {sub.decision === "refer" && canReview(user) && (
          <ReviewActions submissionId={sub.id} />
        )}

        {/* Reviewer audit */}
        {sub.reviewedAt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm">
            <p className="text-slate-700">
              <span className="font-semibold">Reviewed</span> by{" "}
              {sub.reviewedBy?.name ?? "an underwriter"} on {fmtDate(sub.reviewedAt)}
            </p>
            {sub.reviewNote && (
              <p className="text-slate-500 mt-1 italic">&ldquo;{sub.reviewNote}&rdquo;</p>
            )}
          </div>
        )}

        {/* Cancellation notice */}
        {sub.cancelledAt && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm">
            <p className="text-red-800 font-semibold">
              Policy cancelled on {fmtDate(sub.cancelledAt)}
            </p>
            {sub.cancelReason && (
              <p className="text-red-700/80 mt-1 italic">&ldquo;{sub.cancelReason}&rdquo;</p>
            )}
            <p className="text-red-700/70 mt-1 text-xs">
              A short-rate refund may apply — your broker calculates the amount.
            </p>
          </div>
        )}

        {/* Premium summary — only for accepted quotes */}
        {sub.decision === "accept" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-400 mb-1">Annual Premium</p>
              <p className="text-2xl font-bold text-slate-900">{fmtCurrency(sub.annualPremium)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-400 mb-1">Monthly Premium</p>
              <p className="text-2xl font-bold text-indigo-600">{fmtCurrency(sub.monthlyPremium)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400 mb-1">Coverage Amount</p>
              <p className="text-2xl font-bold text-slate-900">{fmtCurrency(sub.coverageAmount)}</p>
            </div>
          </div>
        )}

        {/* Property location map */}
        {sub.propertyAddress && <PropertyMap address={sub.propertyAddress} />}

        {/* Product-specific sections */}
        {sections.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.rows.map((row) => (
              <Field key={row.label} label={row.label} value={row.value} />
            ))}
          </Section>
        ))}

        {/* Mid-term adjustment history */}
        {adjustments.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mid-Term Adjustments ({adjustments.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {adjustments.slice().reverse().map((a, i) => {
                const ap = a.proRata >= 0;
                return (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        Coverage {fmtCurrency(a.oldCoverage)} → <span className="font-semibold">{fmtCurrency(a.newCoverage)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Premium {fmtCurrency(a.oldAnnual)} → {fmtCurrency(a.newAnnual)}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {fmtDate(new Date(a.at))}
                        {a.reason && <><span className="mx-1.5 text-slate-300">·</span>{a.reason}</>}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${ap ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}>
                      {ap ? "+" : "−"}{fmtCurrency(Math.abs(a.proRata))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Section title="Record Information">
          <Field label="Application ID"         value={appId} />
          <Field label="Policy Type"            value={sub.policyType} />
          <Field label="Decision"               value={sub.decision ? sub.decision.charAt(0).toUpperCase() + sub.decision.slice(1) : "Draft"} />
          <Field label="Submitted"              value={fmtDate(sub.createdAt)} />
          <Field label="Last Updated"           value={fmtDate(sub.updatedAt)} />
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <DownloadPolicyButton submissionId={sub.id} />
          {isOwnerOrAdmin && sub.purchased && sub.paymentStatus === "paid" && !sub.cancelledAt && sub.coverageAmount != null && sub.annualPremium != null && (
            <AdjustPolicyButton
              submissionId={sub.id}
              currentCoverage={sub.coverageAmount}
              currentAnnual={sub.annualPremium}
              effectiveAt={sub.effectiveAt ? sub.effectiveAt.toISOString() : null}
              expiresAt={sub.expiresAt ? sub.expiresAt.toISOString() : null}
            />
          )}
          {isOwnerOrAdmin && sub.purchased && (sub.paymentStatus === "paid" || sub.cancelledAt) && (
            <CancelPolicyButton submissionId={sub.id} alreadyCancelled={!!sub.cancelledAt} />
          )}
          {isOwnerOrAdmin && sub.status !== "draft" && !sub.purchased && (
            <DeletePolicyButton submissionId={sub.id} />
          )}
          {isOwnerOrAdmin && sub.status === "draft" && (
            <>
              <Link
                href={`/new-quote/${productSlugForPolicyType(sub.policyType)}?resume=${sub.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume Quote
              </Link>
              <DeleteDraftButton draftId={sub.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
