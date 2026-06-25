import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

// POST /api/submissions/[id]/restore
// Admin-only: reverses a soft delete (clears deletedAt) and logs a "restored"
// audit event.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    select: { deletedAt: true },
  });
  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!sub.deletedAt) {
    return NextResponse.json({ error: "This quote is not deleted." }, { status: 409 });
  }

  await prisma.submission.update({ where: { id }, data: { deletedAt: null } });
  await recordAudit({
    submissionId: id,
    action: "restored",
    actorId: user.id,
    actorName: session.user.name ?? null,
    actorRole: user.role,
    detail: "Quote restored from deleted",
  });

  return NextResponse.json({ ok: true });
}
