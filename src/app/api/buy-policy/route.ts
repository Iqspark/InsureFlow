import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendPaymentRequestEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { portalTokenExpiry } from "@/lib/portalToken";
import { payTokenExpiry } from "@/lib/netTerms";
import { tooMany } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

// POST /api/buy-policy
// RESEND-ONLY: re-emails the secure payment link for an already-bound, unpaid
// policy and refreshes the link's expiry. Binding is done exclusively through the
// signed-proposal flow (POST /api/submissions/[id]/bind) so a signature is always
// required first.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  let submissionId: string;
  try {
    ({ submissionId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  // Cooldown so the payment link can't be used to email-bomb the applicant or
  // repeatedly refresh the token-expiry window.
  const limited = tooMany(`buy-policy:${submissionId}`, 5, 60_000);
  if (limited) return limited;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { broker: { select: { name: true } } },
  });

  if (!sub || sub.deletedAt || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (!sub.purchased) {
    return NextResponse.json(
      { error: "This policy isn't bound yet. Bind it from the signed proposal first." },
      { status: 409 }
    );
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const to = sub.contactEmail;
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file to send the payment link" }, { status: 422 });
  }

  try {
    const token = sub.paymentToken ?? globalThis.crypto.randomUUID();

    // Refresh the link window — aligned to the invoice + cancellation window when
    // net terms are known, else a flat 30 days.
    const boundAt = sub.policyIssuedAt ?? sub.effectiveAt ?? new Date();
    const expiry = sub.dueAt ? payTokenExpiry(boundAt, sub.dueAt) : portalTokenExpiry(new Date());

    await prisma.submission.update({
      where: { id: sub.id },
      data: { paymentToken: token, paymentTokenExpiresAt: expiry },
    });

    await recordAudit({
      submissionId: sub.id,
      action: "payment_link_resent",
      actorId: user.id,
      actorName: session.user.name ?? null,
      actorRole: user.role,
      detail: "Resent the secure payment link",
    });

    const baseUrl = publicBaseUrl(req);
    const sent = await sendPaymentRequestEmail({
      to,
      applicantName: sub.applicantName ?? "Valued Customer",
      appId:         policyNumber(sub),
      policyType:    sub.policyType,
      amount:        sub.annualPremium ?? 0,
      payUrl:        `${baseUrl}/pay/${token}`,
      brokerName:    sub.broker?.name ?? user.role,
      portalUrl:     `${baseUrl}/portal/${token}`,
    });

    return NextResponse.json({
      success: true,
      resent: true,
      sentTo: sent.sentTo,
      previewUrl: sent.previewUrl ?? null,
    });
  } catch (err) {
    captureError(err, { area: "payment", message: "resend payment link failed", extra: { submissionId } });
    return NextResponse.json({ error: "Failed to resend the payment link" }, { status: 500 });
  }
}
