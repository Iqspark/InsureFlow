import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendProposalEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { portalTokenExpiry } from "@/lib/portalToken";
import { tooMany } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

// POST /api/submissions/[id]/send-proposal
// Broker action: emails the applicant a tokenised link to review and e-sign the
// proposal. Sets coverageStatus=awaiting_signature. Re-sending refreshes the link.
// (Phase A of the broker/commercial e-sign → bind → pay flow.)
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

  const limited = tooMany(`send-proposal:${id}`, 5, 60_000);
  if (limited) return limited;

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { broker: { select: { name: true } } },
  });

  if (!sub || sub.deletedAt || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (sub.decision !== "accept") {
    return NextResponse.json({ error: "Only accepted quotes can be sent for signature" }, { status: 400 });
  }
  if (sub.purchased || sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already bound" }, { status: 409 });
  }
  const to = sub.contactEmail;
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file to send the proposal" }, { status: 422 });
  }

  try {
    // Re-issue a token on each send so a fresh, time-boxed link goes out. Sending
    // resets any prior signature back to awaiting (the proposal is being re-offered).
    const token = globalThis.crypto.randomUUID();
    await prisma.submission.update({
      where: { id: sub.id },
      data: {
        coverageStatus: "awaiting_signature",
        proposalToken: token,
        proposalTokenExpiresAt: portalTokenExpiry(new Date()),
        signedAt: null,
      },
    });

    await recordAudit({
      submissionId: sub.id,
      action: "proposal_sent",
      actorId: user.id,
      actorName: session.user.name ?? null,
      actorRole: user.role,
      detail: "Sent the proposal to the applicant for e-signature",
    });

    const signUrl = `${publicBaseUrl(req)}/proposal/${token}`;
    const sent = await sendProposalEmail({
      to,
      applicantName: sub.applicantName ?? "Valued Customer",
      appId:         policyNumber(sub),
      policyType:    sub.policyType,
      amount:        sub.annualPremium ?? 0,
      signUrl,
      brokerName:    sub.broker?.name ?? user.role,
    });

    return NextResponse.json({ success: true, sentTo: sent.sentTo, previewUrl: sent.previewUrl ?? null });
  } catch (err) {
    captureError(err, { area: "email", message: "send proposal failed", extra: { submissionId: id } });
    return NextResponse.json({ error: "Failed to send the proposal" }, { status: 500 });
  }
}
