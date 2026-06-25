import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers, type SessionUser } from "@/lib/access";

// ── GET /api/analytics ────────────────────────────────────────
// Returns aggregated analytics for all submissions.
// Useful for: dashboards, Excel exports, BI tools.
//
// Response shape:
// {
//   overview:          { total, byDecision, rates }
//   premiums:          { avg, min, max, median }
//   byProvince:        [{ province, count, acceptCount, avgPremium }]
//   byPropertyType:    [{ type, count }]
//   byVacancyDuration: [{ duration, count }]
//   topDeclineReasons: [{ reason, count }]
//   topReferReasons:   [{ reason, count }]
//   recentSubmissions: [last 10 records]
//   dailyVolume:       [last 30 days — date + count]
// }
export async function GET() {
  // Cross-broker portfolio data — admin only.
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(session.user as unknown as SessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [
      total,
      byDecision,
      byProvince,
      byPropertyType,
      byVacancy,
      premiumStats,
      allSubmissions,
      recentSubmissions,
    ] = await Promise.all([
      // Total count
      prisma.submission.count(),

      // Group by decision
      prisma.submission.groupBy({
        by: ["decision"],
        _count: { _all: true },
      }),

      // Group by province with avg premium for accepted
      prisma.submission.groupBy({
        by: ["province"],
        _count: { _all: true },
        _avg: { annualPremium: true },
        orderBy: { _count: { province: "desc" } },
      }),

      // Group by property type
      prisma.submission.groupBy({
        by: ["propertyType"],
        _count: { _all: true },
        orderBy: { _count: { propertyType: "desc" } },
      }),

      // Group by vacancy duration
      prisma.submission.groupBy({
        by: ["vacancyDuration"],
        _count: { _all: true },
        orderBy: { _count: { vacancyDuration: "desc" } },
      }),

      // Premium stats (accepted only)
      prisma.submission.aggregate({
        where: { decision: "accept", annualPremium: { not: null } },
        _avg:  { annualPremium: true },
        _min:  { annualPremium: true },
        _max:  { annualPremium: true },
        _count: { annualPremium: true },
      }),

      // All submissions for daily volume and reason aggregation
      prisma.submission.findMany({
        select: {
          createdAt:      true,
          declineReasons:  true,
          referralReasons: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Recent 10 submissions
      prisma.submission.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id:             true,
          createdAt:      true,
          applicantName:  true,
          contactEmail:   true,
          province:       true,
          propertyType:   true,
          propertyValue:  true,
          vacancyDuration: true,
          decision:       true,
          annualPremium:  true,
        },
      }),
    ]);

    // ── Decision breakdown ──────────────────────────────────
    const decisionMap: Record<string, number> = { accept: 0, decline: 0, refer: 0 };
    for (const row of byDecision) {
      if (row.decision) decisionMap[row.decision] = row._count._all;
    }
    const rates = {
      accept:  total ? +((decisionMap.accept  / total) * 100).toFixed(1) : 0,
      decline: total ? +((decisionMap.decline / total) * 100).toFixed(1) : 0,
      refer:   total ? +((decisionMap.refer   / total) * 100).toFixed(1) : 0,
    };

    // ── Decline / refer reason frequency ───────────────────
    const declineFreq: Record<string, number> = {};
    const referFreq:   Record<string, number> = {};

    for (const row of allSubmissions) {
      if (row.declineReasons) {
        const reasons: string[] = safeParseArray(row.declineReasons);
        for (const r of reasons) declineFreq[r] = (declineFreq[r] ?? 0) + 1;
      }
      if (row.referralReasons) {
        const reasons: string[] = safeParseArray(row.referralReasons);
        for (const r of reasons) referFreq[r] = (referFreq[r] ?? 0) + 1;
      }
    }

    const topDeclineReasons = Object.entries(declineFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    const topReferReasons = Object.entries(referFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    // ── Daily volume (last 30 days) ─────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyMap: Record<string, number> = {};
    for (const row of allSubmissions) {
      if (row.createdAt >= thirtyDaysAgo) {
        const dateStr = row.createdAt.toISOString().slice(0, 10);
        dailyMap[dateStr] = (dailyMap[dateStr] ?? 0) + 1;
      }
    }
    const dailyVolume = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ── Assemble response ───────────────────────────────────
    return NextResponse.json({
      overview: {
        total,
        byDecision: decisionMap,
        rates,
      },
      premiums: {
        avg:   premiumStats._avg.annualPremium  ? +premiumStats._avg.annualPremium.toFixed(2) : null,
        min:   premiumStats._min.annualPremium  ?? null,
        max:   premiumStats._max.annualPremium  ?? null,
        count: premiumStats._count.annualPremium,
      },
      byProvince: byProvince.map((r) => ({
        province:   r.province ?? "Unknown",
        count:      r._count._all,
        avgPremium: r._avg.annualPremium ? +r._avg.annualPremium.toFixed(2) : null,
      })),
      byPropertyType: byPropertyType.map((r) => ({
        type:  r.propertyType ?? "Unknown",
        count: r._count._all,
      })),
      byVacancyDuration: byVacancy.map((r) => ({
        duration: r.vacancyDuration ?? "Unknown",
        count:    r._count._all,
      })),
      topDeclineReasons,
      topReferReasons,
      recentSubmissions,
      dailyVolume,
    });
  } catch (err) {
    console.error("[GET /api/analytics]", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
