export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import { policyNumber } from "@/utils/policyNumber";
import RestoreButton from "@/components/RestoreButton";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DeletedItemsPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);

  // Opt in to deleted rows (the client extension hides them by default).
  const rows = await prisma.submission.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 100,
    include: {
      broker: { select: { name: true } },
      auditEvents: { where: { action: "deleted" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Deleted Items</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Deleted Items</h1>
          <p className="text-slate-500 text-sm">
            Soft-deleted quotes are hidden everywhere else but preserved here with their audit trail. Restore to bring one back.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center">
            <p className="text-sm text-slate-400">No deleted quotes.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">{rows.length} deleted quote{rows.length === 1 ? "" : "s"}</p>
            <div className="space-y-2">
              {rows.map((s) => {
                const deletedBy = s.auditEvents[0]?.actorName ?? "—";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-xs px-4 sm:px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {s.applicantName ?? "—"}
                        <span className="ml-2 font-mono text-xs font-normal text-slate-400">{policyNumber(s)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {s.policyType}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {s.broker?.name ?? "—"}
                        <span className="mx-1.5 text-slate-300">·</span>
                        deleted by {deletedBy}
                        {s.deletedAt && <><span className="mx-1.5 text-slate-300">·</span>{fmtDate(s.deletedAt)}</>}
                      </p>
                    </div>
                    <RestoreButton submissionId={s.id} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
