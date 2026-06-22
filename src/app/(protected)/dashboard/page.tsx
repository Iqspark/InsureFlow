export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { productSlugForPolicyType } from "@/data/products";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import BookCharts from "@/components/BookCharts";
import ExportCsvButton from "@/components/ExportCsvButton";
import ActionRequiredList from "@/components/ActionRequiredList";

function DecisionBadge({ decision, status }: { decision: string | null; status: string }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Draft
      </span>
    );
  }
  const styles: Record<string, string> = {
    accept: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    decline: "bg-red-100 text-red-700 border border-red-200",
    refer: "bg-amber-100 text-amber-700 border border-amber-200",
  };
  const labels: Record<string, string> = { accept: "Accepted", decline: "Declined", refer: "Referred" };
  const d = decision ?? "";
  const cls = styles[d] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[d] ?? d}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const brokerName = session!.user.name;
  const brokerId   = session!.user.id;
  const role       = session!.user.role;

  // Non-broker roles have their own landing pages.
  if (role === "UNDERWRITER") redirect("/review");
  if (role === "ADMIN") redirect("/admin");

  const all = await prisma.submission.findMany({
    where: { brokerId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      createdAt: true,
      applicantName: true,
      policyType: true,
      decision: true,
      status: true,
      purchased: true,
      paymentStatus: true,
      annualPremium: true,
      effectiveAt: true,
      expiresAt: true,
      paidAt: true,
    },
  });

  // Items needing the broker's action: approved & not yet bound, or bound & unpaid.
  const actionItems = all.filter(
    (s) =>
      (s.status !== "draft" && s.decision === "accept" && !s.purchased) ||
      (s.purchased && s.paymentStatus !== "paid")
  );

  const completed = all.filter((s) => s.status !== "draft");
  const total   = completed.length;
  const accepts = completed.filter((s) => s.decision === "accept").length;
  const thisMonth = completed.filter((s) => {
    const now = new Date();
    const d   = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ── Book analytics (charts) ──────────────────────────────
  const decisionSplit = {
    accept: accepts,
    decline: completed.filter((s) => s.decision === "decline").length,
    refer: completed.filter((s) => s.decision === "refer").length,
  };

  const mixCounts: Record<string, number> = {};
  for (const s of completed) mixCounts[s.policyType] = (mixCounts[s.policyType] ?? 0) + 1;
  const productMix = Object.entries(mixCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const now = new Date();
  const premiumByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-CA", { month: "short" });
    const total = completed
      .filter((s) => {
        if (s.decision !== "accept" || s.annualPremium == null) return false;
        const c = new Date(s.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      })
      .reduce((sum, s) => sum + (s.annualPremium ?? 0), 0);
    return { label, total };
  });

  const bound = all.filter((s) => s.purchased);
  const boundPremium = bound.reduce((sum, s) => sum + (s.annualPremium ?? 0), 0);
  const bookStats = {
    decisionSplit,
    productMix,
    premiumByMonth,
    closeRate: total > 0 ? Math.round((accepts / total) * 100) : 0,
    boundPremium,
    boundCount: bound.length,
  };

  // ── Upcoming renewals ────────────────────────────────────
  // Derive a 12-month term when expiresAt isn't stamped (older policies).
  const derivedExpiry = (s: (typeof all)[number]): Date => {
    if (s.expiresAt) return new Date(s.expiresAt);
    const base = new Date(s.paidAt ?? s.createdAt);
    base.setFullYear(base.getFullYear() + 1);
    return base;
  };
  const MS_DAY = 86_400_000;
  const renewals = bound
    .map((s) => {
      const expiry = derivedExpiry(s);
      return { ...s, expiry, days: Math.round((expiry.getTime() - now.getTime()) / MS_DAY) };
    })
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime())
    .slice(0, 5);

  // Latest 5 submissions (quotes or policies).
  const recent = all.slice(0, 5);
  // Latest 5 bound policies.
  const recentPolicies = bound.slice(0, 5);

  const statCards = [
    {
      label: "Total Quotes",
      value: String(total),
      valueCls: "text-slate-900",
      grad: "from-slate-600 to-slate-800",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      label: "Accepted",
      value: String(accepts),
      valueCls: "text-emerald-600",
      grad: "from-emerald-500 to-teal-500",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      label: "This Month",
      value: String(thisMonth),
      valueCls: "text-indigo-600",
      grad: "from-indigo-500 to-blue-500",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      label: "Acceptance Rate",
      value: `${total > 0 ? Math.round((accepts / total) * 100) : 0}%`,
      valueCls: "text-violet-600",
      grad: "from-violet-500 to-fuchsia-500",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
      {/* Welcome + stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Welcome back, {brokerName.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm">
          Here's an overview of your quoted and sold policies.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
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

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Link
          href="/new-quote"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start New Quote
        </Link>
        <Link
          href="/search"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors border border-slate-200 shadow-sm text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          Search Quotes &amp; Policies
        </Link>
        <ExportCsvButton label="Export CSV" />
      </div>

      {/* Book analytics */}
      {total > 0 && <BookCharts stats={bookStats} />}

      {/* Action required — top 5 visible, rest expand inline */}
      {actionItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
            </svg>
            <h2 className="font-semibold text-orange-700 text-sm">
              Action Required ({actionItems.length})
            </h2>
          </div>
          <ActionRequiredList
            items={actionItems.map((s) => ({
              id: s.id,
              applicantName: s.applicantName,
              policyType: s.policyType,
              needsPayment: s.purchased && s.paymentStatus !== "paid",
            }))}
          />
        </div>
      )}

      {/* Upcoming renewals */}
      {renewals.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="font-semibold text-slate-900 text-sm">Upcoming Renewals</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {renewals.map((s) => {
              const soon = s.days <= 60;
              const expired = s.days < 0;
              const badge = expired
                ? { text: "Expired", cls: "text-red-700 bg-red-50 border-red-200" }
                : soon
                ? { text: `${s.days}d left`, cls: "text-amber-700 bg-amber-50 border-amber-200" }
                : { text: `${s.days}d left`, cls: "text-slate-500 bg-slate-50 border-slate-200" };
              return (
                <Link
                  key={s.id}
                  href={`/policy/${s.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.applicantName ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {s.policyType}
                      <span className="mx-1.5 text-slate-300">·</span>
                      Renews {s.expiry.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                    {badge.text}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent submissions — latest 5 quotes or policies */}
      {recent.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 text-sm">Recent Submissions</h2>
            <Link href="/search?show=all" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((s) => {
              const href =
                s.status === "draft"
                  ? `/new-quote/${productSlugForPolicyType(s.policyType)}?resume=${s.id}`
                  : `/policy/${s.id}`;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <Link href={href} className="min-w-0 flex-1 group">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                      {s.applicantName ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {s.policyType}
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono">{s.id.slice(0, 10).toUpperCase()}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      {new Date(s.createdAt).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <DecisionBadge decision={s.decision} status={s.status} />
                    {s.status !== "draft" && <StageBadge purchased={s.purchased} />}
                    {s.purchased && <PaymentBadge paymentStatus={s.paymentStatus} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent policies — latest 5 bound; full book on the Policies page */}
      {recentPolicies.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 text-sm">Recent Policies</h2>
            {bound.length > 5 && (
              <Link href="/policies" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {recentPolicies.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <Link href={`/policy/${s.id}`} className="min-w-0 flex-1 group">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    {s.applicantName ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {s.policyType}
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-mono">{s.id.slice(0, 10).toUpperCase()}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    {new Date(s.createdAt).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <StageBadge purchased={s.purchased} />
                  <PaymentBadge paymentStatus={s.paymentStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
