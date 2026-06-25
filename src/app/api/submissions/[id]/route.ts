import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

// DELETE /api/submissions/[id]
// Soft-deletes a quote owned by the authenticated broker (or any quote for an
// admin): the row is kept with a deletedAt stamp and a "deleted" audit event, so
// the trail survives. Bound policies and quotes under review are protected.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const sub = await prisma.submission.findUnique({
    where: { id },
    select: { brokerId: true, purchased: true, decision: true, reviewedAt: true, deletedAt: true },
  });

  const owns = sub && (user.role === "ADMIN" || sub.brokerId === user.id);
  if (!owns || sub.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (sub.purchased) {
    return NextResponse.json(
      { error: "Bound policies cannot be deleted." },
      { status: 409 }
    );
  }

  // A quote awaiting an underwriter decision is locked — deleting it would
  // pull pending work from the review queue and erase the audit trail.
  if (sub.decision === "refer" && !sub.reviewedAt) {
    return NextResponse.json(
      { error: "Quotes under review cannot be deleted until the review is resolved." },
      { status: 409 }
    );
  }

  await prisma.submission.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({
    submissionId: id,
    action: "deleted",
    actorId: user.id,
    actorName: session.user.name ?? null,
    actorRole: user.role,
    detail: "Quote deleted",
  });

  return NextResponse.json({ ok: true });
}
