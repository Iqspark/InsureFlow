import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendPolicyIssuedEmail, sendUnderwriterNotificationEmail } from "@/lib/email";
import { buildPolicyPdf } from "@/lib/policyDocument";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { portalTokenExpiry } from "@/lib/portalToken";
import { proposalDocumentHash } from "@/lib/proposal";
import { tooMany } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

// POST /api/submissions/[id]/bind
// Broker action: bind a SIGNED proposal. Requires coverageStatus=signed and that
// the signature still matches the current proposal (a quote edit voids it). Issues
// the full policy at bind, sets the 12-month term, and emails the policy + invoice.
// (Phase B of the broker/commercial e-sign → bind → pay flow.)
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

  const limited = tooMany(`bind:${id}`, 5, 60_000);
  if (limited) return limited;

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      broker: { select: { name: true, email: true } },
      signatures: { orderBy: { signedAt: "desc" }, take: 1 },
    },
  });

  if (!sub || sub.deletedAt || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (sub.decision !== "accept") {
    return NextResponse.json({ error: "Only accepted quotes can be bound" }, { status: 400 });
  }
  if (sub.purchased || sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already bound" }, { status: 409 });
  }
  if (sub.coverageStatus !== "signed") {
    return NextResponse.json({ error: "The proposal must be signed before binding" }, { status: 409 });
  }

  // Integrity: the signature is bound to the exact terms the client accepted. If
  // the quote changed since signing, the hash won't match — re-send for signature.
  const currentHash = proposalDocumentHash({
    policyType:     sub.policyType,
    applicantName:  sub.applicantName,
    province:       sub.province,
    decision:       sub.decision,
    annualPremium:  sub.annualPremium,
    monthlyPremium: sub.monthlyPremium,
    coverageAmount: sub.coverageAmount,
    deductible:     sub.deductible,
  });
  const sig = sub.signatures[0];
  if (!sig || sig.documentHash !== currentHash) {
    return NextResponse.json(
      { error: "The quote changed since it was signed. Please re-send the proposal for signature." },
      { status: 409 }
    );
  }

  const to = sub.contactEmail;
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file" }, { status: 422 });
  }

  try {
    const now = new Date();
    const effectiveAt = now;
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const token = globalThis.crypto.randomUUID();

    // Atomic claim: only one caller flips signed → bound (in force).
    const claimed = await prisma.submission.updateMany({
      where: { id: sub.id, coverageStatus: "signed", purchased: false },
      data: {
        coverageStatus: "bound",
        purchased: true,
        paymentToken: token,
        paymentTokenExpiresAt: portalTokenExpiry(now),
        effectiveAt,
        expiresAt,
        policyIssuedAt: now,
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "This policy is already bound" }, { status: 409 });
    }

    const cad = (n: number | null) =>
      new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n ?? 0);
    await recordAudit({
      submissionId: sub.id,
      action: "bound",
      actorId: user.id,
      actorName: session.user.name ?? null,
      actorRole: user.role,
      detail: `Policy bound from signed proposal · annual premium ${cad(sub.annualPremium)}`,
    });

    const baseUrl = publicBaseUrl(req);

    // Issue the full policy at bind (attached to the email) + the invoice/pay link.
    let pdf;
    try {
      const buffer = await buildPolicyPdf({ ...sub, purchased: true, effectiveAt, expiresAt });
      pdf = { filename: `InsureFlow-Policy-${policyNumber(sub)}.pdf`, content: buffer };
    } catch (pdfErr) {
      captureError(pdfErr, { area: "email", message: "policy PDF render failed at bind", extra: { submissionId: sub.id } });
    }

    const sent = await sendPolicyIssuedEmail({
      to,
      applicantName: sub.applicantName ?? "Valued Customer",
      appId:         policyNumber(sub),
      policyType:    sub.policyType,
      amount:        sub.annualPremium ?? 0,
      payUrl:        `${baseUrl}/pay/${token}`,
      portalUrl:     `${baseUrl}/portal/${token}`,
      brokerName:    sub.broker?.name ?? user.role,
      pdf,
    });

    // Notify the underwriting team on bind (best-effort).
    let underwriterNotified = false;
    const underwriterTo = process.env.UNDERWRITER_EMAIL;
    if (underwriterTo) {
      try {
        await sendUnderwriterNotificationEmail({
          to:             underwriterTo,
          appId:          policyNumber(sub),
          policyType:     sub.policyType,
          applicantName:  sub.applicantName  ?? "Valued Customer",
          applicantEmail: to,
          applicantPhone: sub.contactPhone   ?? "—",
          province:       sub.province       ?? "Canada",
          annualPremium:  sub.annualPremium  ?? 0,
          monthlyPremium: sub.monthlyPremium ?? 0,
          coverageAmount: sub.coverageAmount ?? 0,
          deductible:     sub.deductible     ?? 0,
          brokerName:     sub.broker?.name   ?? session.user.name,
          brokerEmail:    sub.broker?.email  ?? session.user.email,
        });
        underwriterNotified = true;
      } catch (err) {
        captureError(err, { area: "email", message: "underwriter notification failed", extra: { submissionId: sub.id } });
      }
    }

    return NextResponse.json({
      success: true,
      sentTo: sent.sentTo,
      previewUrl: sent.previewUrl ?? null,
      underwriterNotified,
    });
  } catch (err) {
    captureError(err, { area: "payment", message: "bind failed", extra: { submissionId: id } });
    return NextResponse.json({ error: "Failed to bind the policy" }, { status: 500 });
  }
}
