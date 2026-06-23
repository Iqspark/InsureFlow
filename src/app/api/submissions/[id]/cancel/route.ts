import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";

// POST /api/submissions/[id]/cancel
// Owning broker (or admin) cancels a bound policy mid-term.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  let reason = "";
  try {
    const body = (await req.json()) as { reason?: string };
    reason = body.reason ?? "";
  } catch {
    reason = "";
  }

  const sub = await prisma.submission.findUnique({ where: { id: params.id } });
  if (!sub || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (!sub.purchased) {
    return NextResponse.json({ error: "Only bound policies can be cancelled" }, { status: 400 });
  }
  if (sub.cancelledAt) {
    return NextResponse.json({ error: "This policy is already cancelled" }, { status: 409 });
  }

  await prisma.submission.update({
    where: { id: sub.id },
    data: { cancelledAt: new Date(), cancelReason: reason.trim() || null },
  });

  return NextResponse.json({ success: true });
}
