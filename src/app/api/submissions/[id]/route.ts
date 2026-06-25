import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/access";

// DELETE /api/submissions/[id]
// Deletes a quote owned by the authenticated broker (or any quote for an admin).
// Bound policies (purchased) are protected and cannot be deleted.
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
    select: { brokerId: true, purchased: true, decision: true, reviewedAt: true },
  });

  const owns = sub && (user.role === "ADMIN" || sub.brokerId === user.id);
  if (!owns) {
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

  await prisma.submission.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
