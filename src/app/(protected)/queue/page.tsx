export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import SubmissionSearchBox from "@/components/SubmissionSearchBox";
import EmptyState from "@/components/EmptyState";

const PAGE_SIZE = 10;
const MS_DAY = 86_400_000;

function fmtCurrency(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function QueuePage({
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
    decision: "refer",
    status: { not: "draft" },
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
      orderBy: { createdAt: "asc" }, // oldest first — most urgent at the top
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, createdAt: true, applicantName: true, policyType: true,
        annualPremium: true, broker: { select: { name: true } },
      },
    }),
  ]);

  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pageHref = (n: number) =>
    `/queue?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Pending Review</h1>
          <p className="text-slate-500 text-sm">
            All referred quotes awaiting a decision, oldest first. Search by applicant name or policy.
          </p>
        </div>

        <SubmissionSearchBox
          endpoint="/api/queue/suggest"
          basePath="/queue"
          placeholder="Search pending reviews by applicant name or policy…"
          initialValue={q}
        />

        {total === 0 ? (
          <EmptyState
            iconPath="M5 13l4 4L19 7"
            title={q ? "No pending reviews found" : "All caught up"}
            subtitle={q ? `No referred quote matches “${q}”.` : "No referred quotes are waiting for review."}
          />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">{total} awaiting decision · oldest first</p>
            <div className="space-y-2">
              {rows.map((s) => {
                const days = Math.floor((now.getTime() - new Date(s.createdAt).getTime()) / MS_DAY);
                const age =
                  days >= 5 ? { cls: "text-red-700 bg-red-50 border-red-200" }
                  : days >= 2 ? { cls: "text-amber-700 bg-amber-50 border-amber-200" }
                  : { cls: "text-slate-500 bg-slate-50 border-slate-200" };
                return (
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
                        {fmtCurrency(s.annualPremium)}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {fmtDate(s.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${age.cls}`}>
                      {days === 0 ? "Today" : `${days}d`}
                    </span>
                  </Link>
                );
              })}
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
