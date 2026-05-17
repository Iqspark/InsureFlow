import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { ReactNode } from "react";

// Makes an entire <tr> row act as a link by overlaying an <a> on the first cell
function LinkRow({
  href,
  children,
  striped,
}: {
  href: string;
  children: ReactNode;
  striped: boolean;
}) {
  return (
    <tr className={`relative hover:bg-indigo-50/60 transition-colors cursor-pointer group ${striped ? "bg-slate-50/50" : ""}`}>
      {children}
      {/* Invisible full-row link anchored to the applicant-name cell */}
      <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap w-10">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          View
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </td>
    </tr>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const styles: Record<string, string> = {
    accept:
      "bg-emerald-100 text-emerald-700 border border-emerald-200",
    decline: "bg-red-100 text-red-700 border border-red-200",
    refer:   "bg-amber-100 text-amber-700 border border-amber-200",
  };
  const labels: Record<string, string> = {
    accept: "Accepted",
    decline: "Declined",
    refer: "Referred",
  };
  const cls = styles[decision] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[decision] ?? decision}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const brokerName = session!.user.name;
  const brokerId   = session!.user.id;

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
    },
  });

  const total   = submissions.length;
  const accepts = submissions.filter((s) => s.decision === "accept").length;
  const thisMonth = submissions.filter((s) => {
    const now = new Date();
    const d   = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      {/* Welcome + stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Welcome back, {brokerName.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm">
          Here's an overview of your quoted and sold policies.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
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

      {/* Policies table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Recent Policies</h2>
        </div>

        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No policies yet</p>
            <p className="text-xs text-slate-400">Start a new quote to see policies here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Applicant Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Policy Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Application ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Policy Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="w-10"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub, i) => (
                  <LinkRow key={sub.id} href={`/policy/${sub.id}`} striped={i % 2 !== 0}>
                    <td className="px-4 sm:px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {sub.applicantName ?? "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-slate-600 whitespace-nowrap">
                      {sub.policyType}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {sub.id.slice(0, 10).toUpperCase()}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <DecisionBadge decision={sub.decision} />
                    </td>
                  </LinkRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
