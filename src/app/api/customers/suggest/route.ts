import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";

// GET /api/customers/suggest?q= — typeahead for the Customers search box.
// Returns distinct customers (by email/name) matching name OR email.
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
      OR: [
        { applicantName: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { applicantName: true, contactEmail: true },
  });

  const seen = new Set<string>();
  const out: { name: string; email: string | null }[] = [];
  for (const r of rows) {
    const key = (r.contactEmail ?? r.applicantName ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.applicantName ?? r.contactEmail ?? "Unknown", email: r.contactEmail });
    if (out.length >= 8) break;
  }

  return NextResponse.json({ data: out });
}
