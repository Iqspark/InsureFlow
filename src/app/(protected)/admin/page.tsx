export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import AdminAnalytics from "@/components/AdminAnalytics";
import ProductMixCard from "@/components/ProductMixCard";
import PremiumByProductCard from "@/components/PremiumByProductCard";
import TopBrokersCard from "@/components/TopBrokersCard";
import ConversionFunnel, { type FunnelStage, type FunnelRow } from "@/components/ConversionFunnel";
import ProductSignals, { type ProductSignal } from "@/components/ProductSignals";
import ExportCsvButton from "@/components/ExportCsvButton";

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);
  const adminName = session!.user.name;

  const [total, accepts, declines, refers, paid, userCount, boundAgg, rows, funnelRows] = await Promise.all([
    prisma.submission.count({ where: { status: { not: "draft" } } }),
    prisma.submission.count({ where: { decision: "accept" } }),
    prisma.submission.count({ where: { decision: "decline" } }),
    prisma.submission.count({ where: { decision: "refer" } }),
    prisma.submission.count({ where: { paymentStatus: "paid" } }),
    prisma.broker.count(),
    prisma.submission.aggregate({ _sum: { annualPremium: true }, where: { purchased: true } }),
    prisma.submission.findMany({
      where: { status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        decision: true, policyType: true, annualPremium: true, createdAt: true, purchased: true,
        broker: { select: { name: true } },
      },
    }),
    // All submissions incl. drafts — funnel "started" counts every quote begun.
    prisma.submission.findMany({
      take: 5000,
      orderBy: { createdAt: "desc" },
      select: {
        status: true, decision: true, policyType: true, purchased: true, paymentStatus: true,
        broker: { select: { name: true } },
      },
    }),
  ]);

  // ── Analytics ────────────────────────────────────────────
  const now = new Date();
  const premiumByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-CA", { month: "short" });
    const totalP = rows
      .filter((s) => {
        if (s.decision !== "accept" || s.annualPremium == null) return false;
        const c = new Date(s.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      })
      .reduce((sum, s) => sum + (s.annualPremium ?? 0), 0);
    return { label, total: totalP };
  });

  const mixCounts: Record<string, number> = {};
  const premiumByProductMap: Record<string, number> = {};
  for (const s of rows) {
    mixCounts[s.policyType] = (mixCounts[s.policyType] ?? 0) + 1;
    if (s.purchased) premiumByProductMap[s.policyType] = (premiumByProductMap[s.policyType] ?? 0) + (s.annualPremium ?? 0);
  }
  const productMix = Object.entries(mixCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const premiumByProduct = Object.entries(premiumByProductMap)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Top brokers by bound premium (summary; full table on /admin/brokers).
  const brokerPrem: Record<string, number> = {};
  for (const s of rows) {
    if (!s.purchased) continue;
    const name = s.broker?.name ?? "Unassigned";
    brokerPrem[name] = (brokerPrem[name] ?? 0) + (s.annualPremium ?? 0);
  }
  const topBrokers = Object.entries(brokerPrem)
    .map(([name, premium]) => ({ name, premium }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 5);

  // ── Conversion funnel: started → quoted → bound → paid ────
  const emptyStage = (): FunnelStage => ({ started: 0, quoted: 0, bound: 0, paid: 0 });
  const addToStage = (st: FunnelStage, s: { decision: string | null; purchased: boolean; paymentStatus: string }) => {
    st.started++;
    if (s.decision === "accept") st.quoted++;
    if (s.purchased) st.bound++;
    if (s.paymentStatus === "paid") st.paid++;
  };
  const funnelOverall = emptyStage();
  const productStage: Record<string, FunnelStage> = {};
  const brokerStage: Record<string, FunnelStage> = {};
  for (const s of funnelRows) {
    addToStage(funnelOverall, s);
    addToStage((productStage[s.policyType] ??= emptyStage()), s);
    addToStage((brokerStage[s.broker?.name ?? "Unassigned"] ??= emptyStage()), s);
  }
  const toFunnelRows = (m: Record<string, FunnelStage>): FunnelRow[] =>
    Object.entries(m)
      .map(([label, st]) => ({ label, ...st }))
      .sort((a, b) => b.started - a.started)
      .slice(0, 8);
  const funnelByProduct = toFunnelRows(productStage);
  const funnelByBroker = toFunnelRows(brokerStage);

  // ── Underwriting signals: decline/refer mix vs portfolio ──
  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  type Counts = { accept: number; decline: number; refer: number; completed: number };
  const prodCounts: Record<string, Counts> = {};
  let portDecline = 0, portRefer = 0, portCompleted = 0;
  for (const s of funnelRows) {
    if (!s.decision) continue; // completed quotes only
    const c = (prodCounts[s.policyType] ??= { accept: 0, decline: 0, refer: 0, completed: 0 });
    c.completed++;
    portCompleted++;
    if (s.decision === "accept") c.accept++;
    else if (s.decision === "decline") { c.decline++; portDecline++; }
    else if (s.decision === "refer") { c.refer++; portRefer++; }
  }
  const portDeclineRate = rate(portDecline, portCompleted);
  const portReferRate = rate(portRefer, portCompleted);
  const MIN_SAMPLE = 5;
  const productSignals: ProductSignal[] = Object.entries(prodCounts)
    .map(([product, c]) => {
      const acceptRate = rate(c.accept, c.completed);
      const declineRate = rate(c.decline, c.completed);
      const referRate = rate(c.refer, c.completed);
      const flags: ProductSignal["flags"] = [];
      if (c.completed >= MIN_SAMPLE) {
        const dDelta = declineRate - portDeclineRate;
        if (dDelta >= 20) flags.push({ kind: "decline", severity: "high", message: `Decline rate ${declineRate}% is far above the ${portDeclineRate}% portfolio average — rating factors may be too strict or risk appetite misaligned; review underwriting rules.` });
        else if (dDelta >= 10) flags.push({ kind: "decline", severity: "warn", message: `Decline rate ${declineRate}% is above the ${portDeclineRate}% portfolio average — worth reviewing the rating factors.` });
        const rDelta = referRate - portReferRate;
        if (rDelta >= 20) flags.push({ kind: "refer", severity: "high", message: `Referral rate ${referRate}% is far above the ${portReferRate}% portfolio average — consider automating referral thresholds to cut manual review.` });
        else if (rDelta >= 10) flags.push({ kind: "refer", severity: "warn", message: `Referral rate ${referRate}% is above the ${portReferRate}% portfolio average — referral thresholds may be too sensitive.` });
      }
      return { product, completed: c.completed, acceptRate, declineRate, referRate, flags };
    })
    .sort((a, b) => b.completed - a.completed);

  const boundPremium = boundAgg._sum.annualPremium ?? 0;
  const adminStats = {
    premiumByMonth,
    decisionSplit: { accept: accepts, decline: declines, refer: refers },
    acceptanceRate: total > 0 ? Math.round((accepts / total) * 100) : 0,
  };

  const statCards = [
    { label: "Total Quotes", value: String(total), valueCls: "text-slate-900", grad: "from-slate-600 to-slate-800", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { label: "Premium Bound", value: fmtCurrency(boundPremium), valueCls: "text-indigo-600", grad: "from-indigo-500 to-blue-500", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Paid Policies", value: String(paid), valueCls: "text-emerald-600", grad: "from-emerald-500 to-teal-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Pending Referrals", value: String(refers), valueCls: "text-amber-600", grad: "from-amber-500 to-orange-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Users", value: String(userCount), valueCls: "text-violet-600", grad: "from-violet-500 to-fuchsia-500", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z" },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Welcome back, {adminName.split(" ")[0]}
            </h1>
            <p className="text-slate-500 text-sm">
              Portfolio overview across all brokers.
            </p>
          </div>
          <ExportCsvButton label="Export CSV" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl p-4 border border-slate-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className={`w-9 h-9 rounded-lg bg-linear-to-br ${c.grad} flex items-center justify-center mb-3 shadow-xs`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={c.icon} />
                </svg>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{c.label}</p>
              <p className={`text-2xl font-bold ${c.valueCls}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Analytics */}
        {total > 0 && <AdminAnalytics stats={adminStats} />}

        {/* Conversion funnel + underwriting signals */}
        {total > 0 && (
          <ConversionFunnel
            overall={funnelOverall}
            byProduct={funnelByProduct}
            byBroker={funnelByBroker}
            aside={<ProductMixCard data={productMix} />}
            byProductAside={<PremiumByProductCard data={premiumByProduct} />}
            byBrokerAside={<TopBrokersCard data={topBrokers} />}
          />
        )}
        {productSignals.length > 0 && (
          <ProductSignals signals={productSignals} portfolio={{ declineRate: portDeclineRate, referRate: portReferRate }} />
        )}
      </div>
    </div>
  );
}
