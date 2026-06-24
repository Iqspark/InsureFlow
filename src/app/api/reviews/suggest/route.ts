import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReview, type SessionUser } from "@/lib/access";
import { policyNumber } from "@/utils/policyNumber";

// GET /api/reviews/suggest?q= — typeahead for the All Reviews page.
// Underwriter/Admin only; matches applicant name OR policy type OR number.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ data: [] });

  const rows = await prisma.submission.findMany({
    where: {
      reviewedAt: { not: null },
      OR: [
        { applicantName: { contains: q, mode: "insensitive" } },
        { policyType: { contains: q, mode: "insensitive" } },
        { id: { startsWith: q.toLowerCase() } },
      ],
    },
    orderBy: { reviewedAt: "desc" },
    take: 8,
    select: { id: true, applicantName: true, policyType: true, decision: true, createdAt: true },
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      appId: policyNumber(r),
      applicantName: r.applicantName,
      policyType: r.policyType,
      decision: r.decision,
    })),
  });
}
