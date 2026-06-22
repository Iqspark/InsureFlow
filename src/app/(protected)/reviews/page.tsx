export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import SubmissionSearchBox from "@/components/SubmissionSearchBox";
import EmptyState from "@/components/EmptyState";

const PAGE_SIZE = 10;

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  requireRole(session, ["UNDERWRITER", "ADMIN"]);

  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page ?? 1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    reviewedAt: { not: null },
    ...(q
      ? {
          OR: [
            { applicantName: { contains: q, mode: "insensitive" } },
            { policyType: { contains: q, mode: "insensitive" } },
            { id: { startsWith: q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: { reviewedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, applicantName: true, policyType: true, decision: true,
        reviewedAt: true, reviewNote: true,
        reviewedBy: { select: { name: true } },
        broker: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pageHref = (n: number) =>
    `/reviews?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">All Reviews</h1>
          <p className="text-slate-500 text-sm">
            Every underwriting decision, most recent first. Search by applicant name or policy.
          </p>
        </div>

        <SubmissionSearchBox
          endpoint="/api/reviews/suggest"
          basePath="/reviews"
          placeholder="Search reviews by applicant name or policy…"
          initialValue={q}
        />

        {total === 0 ? (
          <EmptyState
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            title={q ? "No reviews found" : "No reviews yet"}
            subtitle={q ? `No reviewed submission matches “${q}”.` : "Decisions you make on referred quotes will appear here."}
          />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">{total} review{total !== 1 ? "s" : ""}</p>
            <div className="space-y-2">
              {rows.map((s) => (
                <Link
                  key={s.id}
                  href={`/policy/${s.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.applicantName ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {s.policyType}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {s.broker?.name ?? "—"}
                      <span className="mx-1.5 text-slate-300">·</span>
                      by {s.reviewedBy?.name ?? "—"}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {s.reviewedAt ? fmtDate(s.reviewedAt) : ""}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p className="text-xs text-slate-400">
                  Showing <span className="font-medium text-slate-600">{from}–{to}</span> of {total}
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">← Prev</Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">← Prev</span>
                  )}
                  <span className="px-3 py-1.5 text-sm text-slate-500">Page {page} of {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">Next →</Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">Next →</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
