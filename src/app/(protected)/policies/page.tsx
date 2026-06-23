export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";
import { productSlugForPolicyType } from "@/data/products";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import CancelledBadge from "@/components/CancelledBadge";
import DeleteQuoteButton from "@/components/DeleteQuoteButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import EmptyState from "@/components/EmptyState";
import PolicySearchBox from "@/components/PolicySearchBox";

const PAGE_SIZE = 10;

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

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as unknown as SessionUser;

  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  // Policies tab = bound policies only (quotes live under Search).
  // Optional filter by policy number (app id prefix, stored lowercase).
  const where = {
    ...submissionScopeWhere(user),
    purchased: true,
    ...(q
      ? { OR: [{ applicantName: { contains: q, mode: "insensitive" as const } }, { id: { startsWith: q.toLowerCase() } }] }
      : {}),
  };
  const pageHref = (n: number) =>
    `/policies?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`;

  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        applicantName: true,
        policyType: true,
        decision: true,
        status: true,
        purchased: true,
        paymentStatus: true,
        cancelledAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Policies</h1>
            <p className="text-slate-500 text-sm">
              Your bound policies, newest first. (Quotes live under Search.)
            </p>
          </div>
          <ExportCsvButton label="Export CSV" params={{ stage: "policy" }} />
        </div>

        {/* Typeahead — search by customer name or policy number */}
        <PolicySearchBox initialValue={q} />

        {total === 0 ? (
          q ? (
            <EmptyState
              iconPath="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              title="No policy found"
              subtitle={`No bound policy matches “${q}”. Try a different name or policy number.`}
              action={
                <Link href="/policies" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all">
                  Clear search
                </Link>
              }
            />
          ) : (
            <EmptyState
              iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              title="No bound policies yet"
              subtitle="Bind an accepted quote and it’ll show up here as an active policy."
              action={
                <Link href="/new-quote" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-all">
                  Start a new quote →
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((sub) => {
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
                      {sub.purchased && (sub.cancelledAt ? <CancelledBadge /> : <PaymentBadge paymentStatus={sub.paymentStatus} />)}
                      {user.role !== "UNDERWRITER" && (
                        <DeleteQuoteButton submissionId={sub.id} purchased={sub.purchased} />
                      )}
                    </div>
                  </div>
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
                    <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      ← Prev
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">← Prev</span>
                  )}
                  <span className="px-3 py-1.5 text-sm text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Next →
                    </Link>
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
