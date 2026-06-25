export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import RangeTabs from "@/components/RangeTabs";
import {
  computeBrokerMetrics, normalizeRange, rangeCutoff, pctRate, RANGE_LABEL,
  type SubLite,
} from "@/lib/brokerStats";

const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

function Stat({ label, value, cls = "text-slate-900", sub }: { label: string; value: string; cls?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
      <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function BrokerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);

  const { id } = await params;
  const range = normalizeRange((await searchParams).range);
  const cutoff = rangeCutoff(range, new Date());

  const [broker, subs] = await Promise.all([
    prisma.broker.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } }),
    prisma.submission.findMany({
      where: { brokerId: id, ...(cutoff ? { createdAt: { gte: cutoff } } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, applicantName: true, policyType: true, createdAt: true,
        decision: true, status: true, purchased: true, paymentStatus: true,
        cancelledAt: true, annualPremium: true, paidAmount: true,
      },
    }),
  ]);

  if (!broker) notFound();

  const m = computeBrokerMetrics(subs as SubLite[]);

  // Per-product breakdown.
  const prod: Record<string, { quotes: number; accepted: number; bound: number; paid: number }> = {};
  for (const s of subs) {
    const p = (prod[s.policyType] ??= { quotes: 0, accepted: 0, bound: 0, paid: 0 });
    p.quotes++;
    if (s.decision === "accept") p.accepted++;
    if (s.purchased) p.bound++;
    if (s.paymentStatus === "paid") p.paid++;
  }
  const products = Object.entries(prod).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.quotes - a.quotes);

  const pending = subs.filter((s) => s.purchased && s.paymentStatus !== "paid" && !s.cancelledAt);
  const recent = subs.slice(0, 8);

  const decisions = [
    { key: "Accepted", val: m.accepted, cls: "bg-emerald-500" },
    { key: "Referred", val: m.referred, cls: "bg-amber-500" },
    { key: "Declined", val: m.declined, cls: "bg-red-500" },
  ];
  const decTotal = m.accepted + m.referred + m.declined || 1;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors">Admin</Link>
          <span>/</span>
          <Link href={`/admin/brokers?range=${range}`} className="hover:text-indigo-600 transition-colors">Broker Performance</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{broker.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{broker.name}</h1>
              {!broker.active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>
              )}
            </div>
            <p className="text-slate-500 text-sm">{broker.email} · {RANGE_LABEL[range]}</p>
          </div>
          <RangeTabs basePath={`/admin/brokers/${broker.id}`} current={range} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Quotes" value={String(m.quotes)} sub={`${m.completed} completed`} />
          <Stat label="Bound Policies" value={String(m.bound)} cls="text-violet-600" sub={`${pctRate(m.bound, m.accepted)}% of accepted`} />
          <Stat label="Paid Policies" value={String(m.paid)} cls="text-emerald-600" sub={`${pctRate(m.paid, m.bound)}% collected`} />
          <Stat label="Pending Payment" value={m.pendingCount > 0 ? cad(m.pendingValue) : "—"} cls={m.pendingCount > 0 ? "text-amber-600" : "text-slate-400"} sub={m.pendingCount > 0 ? `${m.pendingCount} awaiting` : "none"} />
          <Stat label="Premium Bound" value={cad(m.premiumBound)} cls="text-indigo-600" />
          <Stat label="Premium Collected" value={cad(m.premiumPaid)} cls="text-emerald-600" />
          <Stat label="Acceptance Rate" value={`${pctRate(m.accepted, m.completed)}%`} sub={`${m.accepted}/${m.completed}`} />
          <Stat label="Cancelled" value={String(m.cancelled)} cls={m.cancelled > 0 ? "text-red-600" : "text-slate-400"} />
        </div>

        {/* Decisions split */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Decisions</h3>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 mb-3">
            {decisions.map((d) => (
              <div key={d.key} className={d.cls} style={{ width: `${(d.val / decTotal) * 100}%` }} title={`${d.key}: ${d.val}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {decisions.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${d.cls}`} />
                <span className="text-slate-600">{d.key}</span>
                <span className="font-semibold text-slate-800">{d.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending payments — actionable */}
        {pending.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden mb-6">
            <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Awaiting Payment ({pending.length})</h3>
              <span className="text-xs font-semibold text-amber-700">{cad(m.pendingValue)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {pending.map((s) => (
                <Link key={s.id} href={`/policy/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.applicantName ?? "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{s.policyType} · {fmtDate(s.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-700 shrink-0">{cad(s.annualPremium ?? 0)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Per-product breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">By Product</h3>
          {products.length === 0 ? (
            <p className="text-sm text-slate-400">No quotes in this period.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="font-medium pb-2 pr-2"></th>
                  <th className="font-medium pb-2 px-2 text-right">Quotes</th>
                  <th className="font-medium pb-2 px-2 text-right">Accepted</th>
                  <th className="font-medium pb-2 px-2 text-right">Bound</th>
                  <th className="font-medium pb-2 pl-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-2 text-slate-700 truncate max-w-[16rem]" title={p.name}>{p.name}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-slate-500">{p.quotes}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-600">{p.accepted}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-violet-600">{p.bound}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-emerald-600">{p.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent activity */}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-slate-400">No activity in this period.</p>}
          {recent.map((s) => (
            <Link key={s.id} href={`/policy/${s.id}`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{s.applicantName ?? "—"}</p>
                <p className="text-xs text-slate-400 truncate">{s.policyType} · {fmtDate(s.createdAt)}</p>
              </div>
              <span className="text-xs font-medium text-slate-500 shrink-0 capitalize">{s.status === "draft" ? "draft" : (s.decision ?? "—")}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
