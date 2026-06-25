export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import RangeTabs from "@/components/RangeTabs";
import AdminTabs from "@/components/admin/AdminTabs";
import {
  computeBrokerMetrics, normalizeRange, rangeCutoff, pctRate, RANGE_LABEL,
  type SubLite, type BrokerMetrics,
} from "@/lib/brokerStats";

const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

type Row = { id: string; name: string; m: BrokerMetrics };

const SORTS = {
  name:         (r: Row) => r.name.toLowerCase(),
  quotes:       (r: Row) => r.m.quotes,
  bound:        (r: Row) => r.m.bound,
  paid:         (r: Row) => r.m.paid,
  pendingValue: (r: Row) => r.m.pendingValue,
  premiumBound: (r: Row) => r.m.premiumBound,
} as const;
type SortKey = keyof typeof SORTS;

export default async function BrokerPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; sort?: string; dir?: string }>;
}) {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);

  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const sort: SortKey = (sp.sort && sp.sort in SORTS ? sp.sort : "premiumBound") as SortKey;
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const cutoff = rangeCutoff(range, new Date());
  const [brokers, subs] = await Promise.all([
    prisma.broker.findMany({
      where: { role: "BROKER", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.submission.findMany({
      where: { brokerId: { not: null }, ...(cutoff ? { createdAt: { gte: cutoff } } : {}) },
      select: {
        brokerId: true, decision: true, status: true, purchased: true,
        paymentStatus: true, cancelledAt: true, annualPremium: true, paidAmount: true,
      },
    }),
  ]);

  const byBroker: Record<string, SubLite[]> = {};
  for (const s of subs) {
    if (!s.brokerId) continue;
    (byBroker[s.brokerId] ??= []).push(s);
  }

  const rows: Row[] = brokers.map((b) => ({ id: b.id, name: b.name, m: computeBrokerMetrics(byBroker[b.id] ?? []) }));
  const get = SORTS[sort];
  rows.sort((a, b) => {
    const av = get(a), bv = get(b);
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });

  // Portfolio totals (footer).
  const tot = rows.reduce((acc, r) => {
    (Object.keys(acc) as (keyof BrokerMetrics)[]).forEach((k) => (acc[k] += r.m[k]));
    return acc;
  }, computeBrokerMetrics([]));

  const Th = ({ k, label, align = "right", title }: { k: SortKey; label: string; align?: "left" | "right"; title?: string }) => {
    const nextDir = sort === k && dir === "desc" ? "asc" : "desc";
    const active = sort === k;
    return (
      <th
        title={title}
        className={`px-2 py-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider ${align === "right" ? "text-right" : "pl-3 text-left"}`}
      >
        <Link
          href={`/admin/brokers?range=${range}&sort=${k}&dir=${nextDir}`}
          className={`inline-flex items-center gap-0.5 transition-colors ${align === "right" ? "justify-end" : ""} ${active ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
        >
          {label}
          <span className={active ? "opacity-100" : "opacity-0"}>{dir === "desc" ? "↓" : "↑"}</span>
        </Link>
      </th>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <AdminTabs active="brokers" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Broker Performance</h1>
            <p className="text-slate-500 text-sm">{RANGE_LABEL[range]} · {rows.length} active broker{rows.length === 1 ? "" : "s"}</p>
          </div>
          <RangeTabs basePath="/admin/brokers" current={range} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <Th k="name" label="Broker" align="left" />
                <Th k="quotes" label="Quotes" title="Quotes started (incl. drafts)" />
                <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-600" title="Accepted">Accept</th>
                <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-red-600" title="Declined">Decline</th>
                <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-amber-600" title="Referred">Refer</th>
                <Th k="bound" label="Bound" title="Policies bound (purchased)" />
                <Th k="paid" label="Paid" title="Policies paid" />
                <Th k="pendingValue" label="Pending" title="Premium awaiting payment" />
                <Th k="premiumBound" label="Premium" title="Total premium bound" />
                <th className="px-2 py-3 pr-3 text-right text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" title="Bind rate: bound ÷ accepted">Bind&nbsp;%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-2 pl-3">
                    <Link href={`/admin/brokers/${r.id}?range=${range}`} className="font-medium text-slate-800 hover:text-indigo-600 transition-colors">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-slate-500">{r.m.quotes}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-emerald-600">{r.m.accepted}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-red-600">{r.m.declined}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-amber-600">{r.m.referred}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-violet-600">{r.m.bound}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-emerald-600">{r.m.paid}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.m.pendingCount > 0 ? (
                      <span className="text-amber-700 font-semibold" title={`${r.m.pendingCount} policy(ies) awaiting payment`}>{cad(r.m.pendingValue)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-800">{cad(r.m.premiumBound)}</td>
                  <td className="py-2.5 pl-2 pr-3 text-right tabular-nums text-slate-500">{pctRate(r.m.bound, r.m.accepted)}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">No active brokers.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <td className="py-2.5 pr-2 pl-3">Total</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{tot.quotes}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700">{tot.accepted}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-red-700">{tot.declined}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-amber-700">{tot.referred}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-violet-700">{tot.bound}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700">{tot.paid}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-amber-700">{tot.pendingValue > 0 ? cad(tot.pendingValue) : "—"}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{cad(tot.premiumBound)}</td>
                  <td className="py-2.5 pl-2 pr-3 text-right tabular-nums">{pctRate(tot.bound, tot.accepted)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
