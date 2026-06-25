import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { buildSubmissionSections } from "@/lib/submissionSections";
import { policyNumber } from "@/utils/policyNumber";
import { isPortalTokenExpired } from "@/lib/portalToken";
import PropertyMap from "@/components/PropertyMap";
import ChangeRequestForm from "@/components/ChangeRequestForm";

export const dynamic = "force-dynamic";

function ShieldLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2L4 7v9c0 7 5.4 13.5 12 15 6.6-1.5 12-8 12-15V7L16 2z" fill="#4f46e5" />
      <path d="M16 6L7 10v6c0 4.8 3.6 9.2 9 10.5C21.4 25.2 25 20.8 25 16v-6L16 6z" fill="#6366f1" />
      <path d="M13 16l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtCAD(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export default async function PolicyPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const sub = await prisma.submission.findUnique({
    where: { paymentToken: token },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || !sub.purchased) notFound();

  if (isPortalTokenExpired(sub.paymentTokenExpiresAt, new Date())) {
    return (
      <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4 py-10">
        <div className="flex items-center gap-2.5 mb-8">
          <ShieldLogo />
          <span className="text-slate-900 font-bold text-xl tracking-tight">InsureFlow</span>
        </div>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">This link has expired</h1>
          <p className="text-sm text-slate-500">
            For your security, this policy link is no longer active. Please contact your broker to have a fresh link sent to you.
          </p>
        </div>
      </div>
    );
  }

  const appId = policyNumber(sub);
  const sections = buildSubmissionSections(sub);
  const isPaid = sub.paymentStatus === "paid";
  const isCancelled = !!sub.cancelledAt;

  const statusLabel = isCancelled ? "Cancelled" : isPaid ? "Active" : "Awaiting payment";
  const statusStyle = isCancelled
    ? "bg-red-100 text-red-700 border-red-200"
    : isPaid
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="min-h-screen app-bg flex flex-col items-center px-4 py-10">
      <div className="flex items-center gap-2.5 mb-8">
        <ShieldLogo />
        <span className="text-slate-900 font-bold text-xl tracking-tight">InsureFlow</span>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {sub.applicantName ?? "Your policy"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {sub.policyType} · Policy{" "}
              <span className="font-mono font-semibold text-slate-700">{appId}</span>
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>

        {/* Cancellation notice */}
        {isCancelled && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm">
            <p className="text-red-800 font-semibold">This policy was cancelled on {fmtDate(sub.cancelledAt)}.</p>
            <p className="text-red-700/80 mt-1 text-xs">Contact your broker for details on any refund.</p>
          </div>
        )}

        {/* Awaiting payment call-to-action */}
        {!isPaid && !isCancelled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">Payment outstanding</p>
              <p className="text-xs text-amber-700/80 mt-0.5">
                Pay {fmtCAD(sub.annualPremium)} to activate your coverage.
              </p>
            </div>
            <a
              href={`/pay/${token}`}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Pay now
            </a>
          </div>
        )}

        {/* Premium / coverage / term summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Annual Premium</p>
            <p className="text-lg font-bold text-slate-900">{fmtCAD(sub.annualPremium)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Coverage</p>
            <p className="text-lg font-bold text-slate-900">{fmtCAD(sub.coverageAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Effective</p>
            <p className="text-sm font-semibold text-slate-900">{fmtDate(sub.effectiveAt)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Expires</p>
            <p className="text-sm font-semibold text-slate-900">{fmtDate(sub.expiresAt)}</p>
          </div>
        </div>

        {/* Download document */}
        <a
          href={`/api/portal/${token}/document`}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 shadow-xs transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download policy document (PDF)
        </a>

        {/* Property location */}
        {sub.propertyAddress && <PropertyMap address={sub.propertyAddress} />}

        {/* Policy details (read-only) */}
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{section.title}</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {section.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-slate-400 mb-0.5">{row.label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Request a change */}
        {!isCancelled && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Request a Change</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-500 mb-3">
                Need to update your coverage or details? Send a note and{" "}
                {sub.broker?.name ? `${sub.broker.name}` : "your broker"} will get back to you.
              </p>
              <ChangeRequestForm token={token} />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          © {new Date().getFullYear()} InsureFlow · This is your secure policy link — please don&apos;t share it.
        </p>
      </div>
    </div>
  );
}
