import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { buildSubmissionSections } from "@/lib/submissionSections";
import { policyNumber } from "@/utils/policyNumber";
import { isPortalTokenExpired } from "@/lib/portalToken";
import { DECLARATION_TEXT } from "@/lib/proposal";
import ProposalSignForm from "@/components/ProposalSignForm";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg flex flex-col items-center px-4 py-10">
      <div className="flex items-center gap-2.5 mb-8">
        <ShieldLogo />
        <span className="text-slate-900 font-bold text-xl tracking-tight">InsureFlow</span>
      </div>
      {children}
    </div>
  );
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const sub = await prisma.submission.findUnique({
    where: { proposalToken: token },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || sub.deletedAt) notFound();

  if (isPortalTokenExpired(sub.proposalTokenExpiresAt, new Date())) {
    return (
      <Shell>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-1">This link has expired</h1>
          <p className="text-sm text-slate-500">
            For your security, this proposal link is no longer active. Please contact your broker to have a fresh link sent to you.
          </p>
        </div>
      </Shell>
    );
  }

  const appId = policyNumber(sub);
  const alreadySigned = sub.coverageStatus === "signed" || sub.coverageStatus === "bound";

  if (alreadySigned) {
    return (
      <Shell>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Proposal signed</h1>
          <p className="text-sm text-slate-500">
            Thank you — your proposal for policy {appId} has been signed. Your broker
            {sub.broker?.name ? ` (${sub.broker.name})` : ""} will bind the policy and follow up with your documents.
          </p>
        </div>
      </Shell>
    );
  }

  const sections = buildSubmissionSections(sub);

  return (
    <Shell>
      <div className="w-full max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review &amp; sign your proposal</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sub.policyType} · Application{" "}
            <span className="font-mono font-semibold text-slate-700">{appId}</span>
          </p>
        </div>

        {/* Premium / coverage summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Annual Premium</p>
            <p className="text-lg font-bold text-slate-900">{fmtCAD(sub.annualPremium)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-xs text-slate-400 mb-1">Monthly Premium</p>
            <p className="text-lg font-bold text-indigo-600">{fmtCAD(sub.monthlyPremium)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 mb-1">Coverage</p>
            <p className="text-lg font-bold text-slate-900">{fmtCAD(sub.coverageAmount)}</p>
          </div>
        </div>

        {/* Details (read-only) */}
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

        {/* Declaration + signature */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Declaration</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{DECLARATION_TEXT}</p>
            <ProposalSignForm token={token} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          © {new Date().getFullYear()} InsureFlow · This is your secure proposal link — please don&apos;t share it.
        </p>
      </div>
    </Shell>
  );
}
