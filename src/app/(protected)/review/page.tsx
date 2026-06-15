export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";

function fmtCurrency(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function StatCard({
  label, value, accent, iconBg, children,
}: {
  label: string; value: number | string; accent: string; iconBg: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        {children}
      </div>
      <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["UNDERWRITER", "ADMIN"]);
  const reviewerName = session!.user.name;

  const [pendingCount, approvedCount, declinedCount, pending, recentlyReviewed] = await Promise.all([
    prisma.submission.count({ where: { decision: "refer", status: { not: "draft" } } }),
    prisma.submission.count({ where: { reviewedAt: { not: null }, decision: "accept" } }),
    prisma.submission.count({ where: { reviewedAt: { not: null }, decision: "decline" } }),
    prisma.submission.findMany({
      where: { decision: "refer", status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, createdAt: true, applicantName: true, policyType: true,
        province: true, annualPremium: true, broker: { select: { name: true } },
      },
    }),
    prisma.submission.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
      take: 15,
      select: {
        id: true, applicantName: true, policyType: true, decision: true,
        reviewedAt: true, reviewedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {reviewerName.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-sm">
            Referred quotes from all brokers awaiting an underwriting decision.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Pending Review" value={pendingCount} accent="text-amber-600" iconBg="bg-amber-50">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </StatCard>
          <StatCard label="Approved" value={approvedCount} accent="text-emerald-600" iconBg="bg-emerald-50">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </StatCard>
          <StatCard label="Declined" value={declinedCount} accent="text-red-600" iconBg="bg-red-50">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </StatCard>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Pending Review</h2>
            <span className="text-xs text-slate-400">{pending.length} referred</span>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">All caught up</p>
              <p className="text-xs text-slate-400">No referred quotes are waiting for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Applicant</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Broker</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Premium</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                    <th className="w-10"><span className="sr-only">Review</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-amber-50/60 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">{s.applicantName ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{s.policyType}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{s.broker?.name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{fmtCurrency(s.annualPremium)}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link href={`/policy/${s.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                          Review
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {recentlyReviewed.length > 0 && (
          <>
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Recently Reviewed</h2>
            <div className="space-y-2">
              {recentlyReviewed.map((s) => (
                <Link
                  key={s.id}
                  href={`/policy/${s.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 hover:border-indigo-300 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.applicantName ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {s.policyType} · by {s.reviewedBy?.name ?? "—"} · {s.reviewedAt ? fmtDate(s.reviewedAt) : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    s.decision === "accept"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}>
                    {s.decision === "accept" ? "Approved" : "Declined"}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
