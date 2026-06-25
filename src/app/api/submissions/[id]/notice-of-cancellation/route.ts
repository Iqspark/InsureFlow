import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendNoticeOfCancellationEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { tooMany } from "@/lib/rateLimit";
import { canIssueNoticeOfCancellation, noticeDays, addDays } from "@/lib/netTerms";
import { captureError } from "@/lib/observability";

// POST /api/submissions/[id]/notice-of-cancellation
// Broker issues a Notice of Cancellation for a past-due, in-force policy. Sets a
// cancellation effective date `CANCELLATION_NOTICE_DAYS` out; the dunning job
// cancels on that date if still unpaid (paying in the window reinstates). (Phase D.)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const limited = tooMany(`noc:${id}`, 5, 60_000);
  if (limited) return limited;

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { broker: { select: { name: true } } },
  });

  if (!sub || sub.deletedAt || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (sub.coverageStatus !== "bound") {
    return NextResponse.json({ error: "Only an in-force policy can be sent a cancellation notice" }, { status: 409 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }
  if (!sub.dueAt || !canIssueNoticeOfCancellation(sub.dueAt, new Date())) {
    return NextResponse.json({ error: "Not yet past due by the grace period" }, { status: 400 });
  }
  const to = sub.contactEmail;
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file" }, { status: 422 });
  }

  try {
    const now = new Date();
    const effectiveAt = addDays(now, noticeDays());

    const claimed = await prisma.submission.updateMany({
      where: { id: sub.id, coverageStatus: "bound", paymentStatus: { not: "paid" } },
      data: {
        coverageStatus: "pending_cancellation",
        cancellationNoticeAt: now,
        cancellationEffectiveAt: effectiveAt,
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "Could not issue the notice" }, { status: 409 });
    }

    await recordAudit({
      submissionId: sub.id,
      action: "cancellation_notice",
      actorId: user.id,
      actorName: session.user.name ?? null,
      actorRole: user.role,
      detail: `Notice of cancellation issued · effective ${effectiveAt.toLocaleDateString("en-CA")}`,
    });

    const sent = await sendNoticeOfCancellationEmail({
      to,
      applicantName: sub.applicantName ?? "Valued Customer",
      appId:         policyNumber(sub),
      policyType:    sub.policyType,
      amount:        sub.annualPremium ?? 0,
      payUrl:        sub.paymentToken ? `${publicBaseUrl(req)}/pay/${sub.paymentToken}` : publicBaseUrl(req),
      effectiveAt,
    });

    return NextResponse.json({ success: true, effectiveAt, sentTo: sent.sentTo, previewUrl: sent.previewUrl ?? null });
  } catch (err) {
    captureError(err, { area: "email", message: "notice of cancellation failed", extra: { submissionId: id } });
    return NextResponse.json({ error: "Failed to issue the notice" }, { status: 500 });
  }
}
