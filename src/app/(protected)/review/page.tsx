export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import ReviewStats from "@/components/ReviewStats";
import ExportCsvButton from "@/components/ExportCsvButton";

function fmtCurrency(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["UNDERWRITER", "ADMIN"]);
  const reviewerName = session!.user.name;

  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [pendingCount, approvedCount, declinedCount, atRiskAgg, pending, recentlyReviewed, reviewed6] =
    await Promise.all([
      prisma.submission.count({ where: { decision: "refer", status: { not: "draft" } } }),
      prisma.submission.count({ where: { reviewedAt: { not: null }, decision: "accept" } }),
      prisma.submission.count({ where: { reviewedAt: { not: null }, decision: "decline" } }),
      prisma.submission.aggregate({
        _sum: { annualPremium: true },
        where: { decision: "refer", status: { not: "draft" } },
      }),
      prisma.submission.findMany({
        where: { decision: "refer", status: { not: "draft" } },
        orderBy: { createdAt: "asc" }, // oldest first — most urgent at the top
        take: 100,
        select: {
          id: true, createdAt: true, applicantName: true, policyType: true,
          province: true, annualPremium: true, referralReasons: true,
          broker: { select: { name: true } },
        },
      }),
      prisma.submission.findMany({
        where: { reviewedAt: { not: null } },
        orderBy: { reviewedAt: "desc" },
        take: 5,
        select: {
          id: true, applicantName: true, policyType: true, decision: true,
          reviewedAt: true, reviewedBy: { select: { name: true } },
        },
      }),
      prisma.submission.findMany({
        where: { reviewedAt: { gte: sixMo }, decision: { in: ["accept", "decline"] } },
        select: { reviewedAt: true, decision: true },
      }),
    ]);

  // ── Analytics ────────────────────────────────────────────
  const approvalRate =
    approvedCount + declinedCount > 0
      ? Math.round((approvedCount / (approvedCount + declinedCount)) * 100)
      : 0;

  const volumeByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-CA", { month: "short" });
    let approve = 0, decline = 0;
    for (const r of reviewed6) {
      if (!r.reviewedAt) continue;
      const c = new Date(r.reviewedAt);
      if (c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()) {
        if (r.decision === "accept") approve++;
        else if (r.decision === "decline") decline++;
      }
    }
    return { label, approve, decline };
  });

  const reasonCounts: Record<string, number> = {};
  for (const s of pending) {
    let reasons: string[] = [];
    try { reasons = JSON.parse(s.referralReasons ?? "[]"); } catch { reasons = []; }
    for (const r of reasons) {
      const key = r.length > 60 ? r.slice(0, 57) + "…" : r;
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
    }
  }
  const topReasons = Object.entries(reasonCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stats = {
    volumeByMonth,
    approved: approvedCount,
    declined: declinedCount,
    approvalRate,
    topReasons,
    premiumAtRisk: atRiskAgg._sum.annualPremium ?? 0,
    pendingCount,
  };

  const MS_DAY = 86_400_000;
  const statCards = [
    { label: "Pending Review", value: String(pendingCount), valueCls: "text-amber-600", grad: "from-amber-500 to-orange-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Premium at Risk", value: fmtCurrency(stats.premiumAtRisk), valueCls: "text-rose-600", grad: "from-rose-500 to-pink-500", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Approval Rate", value: `${approvalRate}%`, valueCls: "text-emerald-600", grad: "from-emerald-500 to-teal-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Reviewed", value: String(approvedCount + declinedCount), valueCls: "text-indigo-600", grad: "from-indigo-500 to-violet-500", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Welcome back, {reviewerName.split(" ")[0]}
            </h1>
            <p className="text-slate-500 text-sm">
              Referred quotes from all brokers awaiting an underwriting decision.
            </p>
          </div>
          <ExportCsvButton label="Export CSV" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl p-4 border border-slate-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center mb-3 shadow-sm`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={c.icon} />
                </svg>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{c.label}</p>
              <p className={`text-2xl font-bold ${c.valueCls}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Analytics */}
        {approvedCount + declinedCount + pendingCount > 0 && <ReviewStats stats={stats} />}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Pending Review</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{pendingCount} referred · oldest first</span>
              {pendingCount > 5 && (
                <Link href="/queue" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  View all →
                </Link>
              )}
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200/60">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">All caught up</p>
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Waiting</th>
                    <th className="w-10"><span className="sr-only">Review</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.slice(0, 5).map((s) => {
                    const days = Math.floor((now.getTime() - new Date(s.createdAt).getTime()) / MS_DAY);
                    const age =
                      days >= 5 ? { cls: "text-red-700 bg-red-50 border-red-200" }
                      : days >= 2 ? { cls: "text-amber-700 bg-amber-50 border-amber-200" }
                      : { cls: "text-slate-500 bg-slate-50 border-slate-200" };
                    return (
                      <tr key={s.id} className="hover:bg-amber-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">{s.applicantName ?? "—"}</td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{s.policyType}</td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{s.broker?.name ?? "—"}</td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{fmtCurrency(s.annualPremium)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${age.cls}`}>
                            {days === 0 ? "Today" : `${days}d`}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">{fmtDate(s.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Link href={`/policy/${s.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                            Review
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {recentlyReviewed.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 text-sm">Recently Reviewed</h2>
              <Link href="/reviews" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            </div>
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
