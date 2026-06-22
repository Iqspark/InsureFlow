import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";

// GET /api/policies/suggest?q= — typeahead for the Policies search box.
// Role-scoped, bound policies only, matches customer name OR policy number.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ data: [] });

  const rows = await prisma.submission.findMany({
    where: {
      ...submissionScopeWhere(user),
      purchased: true,
      OR: [
        { applicantName: { contains: q, mode: "insensitive" } },
        { id: { startsWith: q.toLowerCase() } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, applicantName: true, policyType: true },
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      appId: r.id.slice(0, 10).toUpperCase(),
      applicantName: r.applicantName,
      policyType: r.policyType,
    })),
  });
}
