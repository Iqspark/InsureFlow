import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";

// GET /api/search — search submissions, scoped by role
// (broker = own only; admin/underwriter = all brokers)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const { searchParams } = req.nextUrl;
  const name       = searchParams.get("name")?.trim()       ?? "";
  const appId      = searchParams.get("appId")?.trim()      ?? "";
  const date       = searchParams.get("date")               ?? "";
  const policyType = searchParams.get("policyType")?.trim() ?? "";
  const limit      = Math.min(100, Number(searchParams.get("limit") ?? 50));

  // Build Prisma where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...submissionScopeWhere(user),
    ...(name       ? { applicantName: { contains: name } }   : {}),
    ...(policyType ? { policyType: { contains: policyType } } : {}),
  };

  // Date filter: match records created on the given calendar day
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  // Application ID prefix match (id starts with uppercase prefix from UI)
  if (appId) {
    where.id = { startsWith: appId.toLowerCase() };
  }

  try {
    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        applicantName: true,
        policyType: true,
        decision: true,
        status: true,
        purchased: true,
        paymentStatus: true,
        province: true,
        annualPremium: true,
        broker: { select: { name: true } },
      },
    });

    return NextResponse.json({ data: submissions, total: submissions.length });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json(
      { error: "Failed to search submissions" },
      { status: 500 }
    );
  }
}
