export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { productSlugForPolicyType } from "@/data/products";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import DeleteQuoteButton from "@/components/DeleteQuoteButton";

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
  const labels: Record<string, string> = {
    accept: "Accepted",
    decline: "Declined",
    refer: "Referred",
  };
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

  const submissions = await prisma.submission.findMany({
    where: { brokerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      applicantName: true,
      policyType: true,
      decision: true,
      status: true,
      purchased: true,
      paymentStatus: true,
    },
  });

  // Items needing the broker's action: approved & not yet bound, or bound & unpaid.
  const actionItems = submissions.filter(
    (s) =>
      (s.status !== "draft" && s.decision === "accept" && !s.purchased) ||
      (s.purchased && s.paymentStatus !== "paid")
  );

  const completed = submissions.filter((s) => s.status !== "draft");
  const total   = completed.length;
  const accepts = completed.filter((s) => s.decision === "accept").length;
  const thisMonth = completed.filter((s) => {
    const now = new Date();
    const d   = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">Total Quotes</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">Accepted</p>
          <p className="text-2xl font-bold text-emerald-600">{accepts}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">This Month</p>
          <p className="text-2xl font-bold text-indigo-600">{thisMonth}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">Acceptance Rate</p>
          <p className="text-2xl font-bold text-violet-600">{total > 0 ? Math.round((accepts / total) * 100) : 0}%</p>
        </div>
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
          Search Policies
        </Link>
      </div>

      {/* Action required */}
      {actionItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
            </svg>
            <h2 className="font-semibold text-amber-800 text-sm">
              Action Required ({actionItems.length})
            </h2>
          </div>
          <div className="divide-y divide-amber-100">
            {actionItems.map((s) => {
              const needsPayment = s.purchased && s.paymentStatus !== "paid";
              return (
                <Link
                  key={s.id}
                  href={`/policy/${s.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-amber-100/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {s.applicantName ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {s.policyType}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {needsPayment ? "Bound — awaiting customer payment" : "Approved — ready to bind"}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-full">
                    {needsPayment ? "Resend Link" : "Buy Now"}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent policies */}
      <h2 className="font-semibold text-slate-900 text-sm mb-3">Recent Policies</h2>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No policies yet</p>
          <p className="text-xs text-slate-400">Start a new quote to see policies here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => {
            const href =
              sub.status === "draft"
                ? `/new-quote/${productSlugForPolicyType(sub.policyType)}?resume=${sub.id}`
                : `/policy/${sub.id}`;
            return (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <Link href={href} className="min-w-0 flex-1 group">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    {sub.applicantName ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {sub.policyType}
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-mono">{sub.id.slice(0, 10).toUpperCase()}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    {new Date(sub.createdAt).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <DecisionBadge decision={sub.decision} status={sub.status} />
                  {sub.status !== "draft" && <StageBadge purchased={sub.purchased} />}
                  {sub.purchased && <PaymentBadge paymentStatus={sub.paymentStatus} />}
                  <DeleteQuoteButton submissionId={sub.id} purchased={sub.purchased} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
