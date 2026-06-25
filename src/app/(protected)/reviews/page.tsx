export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import SubmissionSearchBox from "@/components/SubmissionSearchBox";
import PageTabs from "@/components/PageTabs";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function searchOr(q: string): any {
  return q
    ? {
        OR: [
          { applicantName: { contains: q, mode: "insensitive" } },
          { policyType: { contains: q, mode: "insensitive" } },
          { id: { startsWith: q.toLowerCase() } },
        ],
      }
    : {};
}

function Pagination({ page, totalPages, total, from, to, hrefFor }: {
  page: number; totalPages: number; total: number; from: number; to: number; hrefFor: (n: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-5">
      <p className="text-xs text-slate-400">
        Showing <span className="font-medium text-slate-600">{from}–{to}</span> of {total}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">← Prev</Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">← Prev</span>
        )}
        <span className="px-3 py-1.5 text-sm text-slate-500">Page {page} of {totalPages}</span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">Next →</Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">Next →</span>
        )}
      </div>
    </div>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  requireRole(session, ["UNDERWRITER", "ADMIN"]);

  const tab = sp.tab === "all" ? "all" : "pending";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1));

  // Tab counts (unfiltered) for the badges.
  const [pendingCount, reviewedCount] = await Promise.all([
    prisma.submission.count({ where: { decision: "refer", status: { not: "draft" } } }),
    prisma.submission.count({ where: { reviewedAt: { not: null } } }),
  ]);

  const tabs = [
    { label: "Pending", href: "/reviews?tab=pending", active: tab === "pending", badge: pendingCount },
    { label: "All Reviews", href: "/reviews?tab=all", active: tab === "all", badge: reviewedCount },
  ];

  const hrefFor = (n: number) =>
    `/reviews?${new URLSearchParams({ tab, ...(q ? { q } : {}), page: String(n) }).toString()}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
          <p className="text-slate-500 text-sm">Referred quotes awaiting a decision, and every decision already made.</p>
        </div>

        <PageTabs tabs={tabs} />

        {tab === "pending" ? (
          <PendingTable q={q} page={page} hrefFor={hrefFor} />
        ) : (
          <AllReviewsTable q={q} page={page} hrefFor={hrefFor} />
        )}
      </div>
    </div>
  );
}

// ── Pending: referred quotes awaiting a decision ──────────────
async function PendingTable({ q, page, hrefFor }: { q: string; page: number; hrefFor: (n: number) => string }) {
  const where = { decision: "refer", status: { not: "draft" }, ...searchOr(q) };
  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: "asc" }, // oldest first — most urgent at the top
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, createdAt: true, applicantName: true, policyType: true, annualPremium: true, broker: { select: { name: true } } },
    }),
  ]);

  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <SubmissionSearchBox
        endpoint="/api/queue/suggest"
        basePath="/reviews"
        extraParams={{ tab: "pending" }}
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
                days >= 5 ? "text-red-700 bg-red-50 border-red-200"
                : days >= 2 ? "text-amber-700 bg-amber-50 border-amber-200"
                : "text-slate-500 bg-slate-50 border-slate-200";
              return (
                <Link key={s.id} href={`/policy/${s.id}`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-xs px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.applicantName ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {s.policyType}
                      <span className="mx-1.5 text-slate-300">·</span>{s.broker?.name ?? "—"}
                      <span className="mx-1.5 text-slate-300">·</span>{fmtCurrency(s.annualPremium)}
                      <span className="mx-1.5 text-slate-300">·</span>{fmtDate(s.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${age}`}>
                    {days === 0 ? "Today" : `${days}d`}
                  </span>
                </Link>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}

// ── All Reviews: decisions already made (accepted / declined) ──
async function AllReviewsTable({ q, page, hrefFor }: { q: string; page: number; hrefFor: (n: number) => string }) {
  const where = { reviewedAt: { not: null }, ...searchOr(q) };
  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: { reviewedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, applicantName: true, policyType: true, decision: true,
        reviewedAt: true, reviewedBy: { select: { name: true } }, broker: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <SubmissionSearchBox
        endpoint="/api/reviews/suggest"
        basePath="/reviews"
        extraParams={{ tab: "all" }}
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
          <p className="text-xs text-slate-400 mb-3">{total} review{total !== 1 ? "s" : ""} · most recent first</p>
          <div className="space-y-2">
            {rows.map((s) => (
              <Link key={s.id} href={`/policy/${s.id}`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-xs px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.applicantName ?? "—"}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {s.policyType}
                    <span className="mx-1.5 text-slate-300">·</span>{s.broker?.name ?? "—"}
                    <span className="mx-1.5 text-slate-300">·</span>by {s.reviewedBy?.name ?? "—"}
                    <span className="mx-1.5 text-slate-300">·</span>{s.reviewedAt ? fmtDate(s.reviewedAt) : ""}
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
          <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
