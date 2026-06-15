export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function DecisionBadge({ decision, status }: { decision: string | null; status: string }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Draft
      </span>
    );
  }
  const styles: Record<string, string> = {
    accept:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
    decline: "bg-red-100 text-red-700 border border-red-200",
    refer:   "bg-amber-100 text-amber-700 border border-amber-200",
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

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);
  const adminName = session!.user.name;

  const [total, accepts, refers, paid, userCount, recent] = await Promise.all([
    prisma.submission.count({ where: { status: { not: "draft" } } }),
    prisma.submission.count({ where: { decision: "accept" } }),
    prisma.submission.count({ where: { decision: "refer" } }),
    prisma.submission.count({ where: { paymentStatus: "paid" } }),
    prisma.broker.count(),
    prisma.submission.findMany({
      where: { status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, createdAt: true, applicantName: true, policyType: true,
        decision: true, status: true, purchased: true, paymentStatus: true,
        broker: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {adminName.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-sm">
            Portfolio overview across all brokers.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Quotes" value={total} accent="text-slate-900" iconBg="bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </StatCard>
          <StatCard label="Accepted" value={accepts} accent="text-emerald-600" iconBg="bg-emerald-50">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </StatCard>
          <StatCard label="Referred" value={refers} accent="text-amber-600" iconBg="bg-amber-50">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2z" />
            </svg>
          </StatCard>
          <StatCard label="Paid Policies" value={paid} accent="text-indigo-600" iconBg="bg-indigo-50">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </StatCard>
          <StatCard label="Users" value={userCount} accent="text-violet-600" iconBg="bg-violet-50">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </StatCard>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link
            href="/review"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Review Queue
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors border border-slate-200 shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Manage Users
          </Link>
        </div>

        {/* Recent activity */}
        <h2 className="font-semibold text-slate-900 text-sm mb-3">Recent Activity (all brokers)</h2>
        <div className="space-y-2">
          {recent.map((s) => (
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
                  {s.broker?.name ?? "—"}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {fmtDate(s.createdAt)}
                </p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <DecisionBadge decision={s.decision} status={s.status} />
                {s.status !== "draft" && <StageBadge purchased={s.purchased} />}
                {s.purchased && <PaymentBadge paymentStatus={s.paymentStatus} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
