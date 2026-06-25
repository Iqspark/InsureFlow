import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendUnderwriterNotificationEmail, sendPaymentRequestEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { portalTokenExpiry } from "@/lib/portalToken";

// POST /api/buy-policy
// Binds an accepted quote as a policy (purchased=true, payment pending) and
// emails the applicant a secure link to pay on our site. Calling again on a
// bound-but-unpaid policy resends the payment link.
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

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (sub.decision !== "accept") {
    return NextResponse.json({ error: "Only accepted quotes can be purchased" }, { status: 400 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const to = sub.contactEmail;
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file to send the payment link" }, { status: 422 });
  }

  try {
    const alreadyBound = sub.purchased;
    const token = sub.paymentToken ?? globalThis.crypto.randomUUID();

    // On first bind, stamp a 12-month policy term (annual).
    const termData: { effectiveAt?: Date; expiresAt?: Date } = {};
    if (!sub.effectiveAt) {
      const effectiveAt = new Date();
      const expiresAt = new Date(effectiveAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      termData.effectiveAt = effectiveAt;
      termData.expiresAt = expiresAt;
    }

    // Bind (idempotent), ensure a payment token exists, and (re)set its expiry
    // so each send/resend refreshes the public pay/portal link window.
    await prisma.submission.update({
      where: { id: sub.id },
      data: { purchased: true, paymentToken: token, paymentTokenExpiresAt: portalTokenExpiry(new Date()), ...termData },
    });

    const cad = (n: number | null) =>
      new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n ?? 0);
    await recordAudit({
      submissionId: sub.id,
      action: alreadyBound ? "payment_link_resent" : "bound",
      actorId: user.id,
      actorName: session.user.name ?? null,
      actorRole: user.role,
      detail: alreadyBound
        ? "Resent the secure payment link"
        : `Policy bound · annual premium ${cad(sub.annualPremium)}`,
    });

    // Email the applicant a link to pay on our site.
    const baseUrl = publicBaseUrl(req);
    const payUrl = `${baseUrl}/pay/${token}`;
    const sent = await sendPaymentRequestEmail({
      to,
      applicantName: sub.applicantName ?? "Valued Customer",
      appId:         policyNumber(sub),
      policyType:    sub.policyType,
      amount:        sub.annualPremium ?? 0,
      payUrl,
      brokerName:    sub.broker?.name ?? user.role,
      portalUrl:     `${baseUrl}/portal/${token}`,
    });

    // Notify the underwriting team only on the first bind (best-effort).
    let underwriterNotified = false;
    const underwriterTo = process.env.UNDERWRITER_EMAIL;
    if (!alreadyBound && underwriterTo) {
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
        console.error("[buy-policy] underwriter notification failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      resent: alreadyBound,
      sentTo: sent.sentTo,
      previewUrl: sent.previewUrl ?? null,
      underwriterNotified,
    });
  } catch (err) {
    console.error("[POST /api/buy-policy] bind/send failed:", err);
    return NextResponse.json({ error: "Failed to bind policy or send payment link" }, { status: 500 });
  }
}
