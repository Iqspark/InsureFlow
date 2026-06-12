import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPolicyConfirmationEmail, sendUnderwriterNotificationEmail } from "@/lib/email";

// POST /api/buy-policy
// Looks up the submission, sends a confirmation email to the applicant.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  console.log("[buy-policy] session:", session?.user?.id ?? "NO SESSION");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let submissionId: string;
  try {
    ({ submissionId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  console.log("[buy-policy] submissionId:", submissionId);

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  // Fetch the submission — ensure it belongs to this broker
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { broker: { select: { name: true, email: true } } },
  });
  console.log("[buy-policy] sub found:", sub?.id ?? "NOT FOUND", "brokerId:", sub?.brokerId, "sessionId:", session.user.id);

  if (!sub || sub.brokerId !== session.user.id) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }

  if (sub.decision !== "accept") {
    console.log("[buy-policy] decision is not accept:", sub.decision);
    return NextResponse.json({ error: "Only accepted quotes can be purchased" }, { status: 400 });
  }

  const to = sub.contactEmail;
  console.log("[buy-policy] sending to:", to);
  if (!to) {
    return NextResponse.json({ error: "No applicant email on file" }, { status: 422 });
  }

  try {
    const result = await sendPolicyConfirmationEmail({
      to,
      applicantName:  sub.applicantName  ?? "Valued Customer",
      appId:          sub.id.slice(0, 10).toUpperCase(),
      policyType:     sub.policyType,
      province:       sub.province       ?? "Canada",
      annualPremium:  sub.annualPremium  ?? 0,
      monthlyPremium: sub.monthlyPremium ?? 0,
      coverageAmount: sub.coverageAmount ?? 0,
      deductible:     sub.deductible     ?? 0,
      brokerName:     sub.broker?.name   ?? session.user.name,
      brokerEmail:    sub.broker?.email  ?? session.user.email,
    });

    // Mark the quote as a bound policy
    await prisma.submission.update({
      where: { id: sub.id },
      data: { purchased: true },
    });

    // Notify the underwriting team (best-effort — never block the bind)
    const underwriterTo = process.env.UNDERWRITER_EMAIL;
    let underwriterNotified = false;
    if (underwriterTo) {
      try {
        await sendUnderwriterNotificationEmail({
          to:             underwriterTo,
          appId:          sub.id.slice(0, 10).toUpperCase(),
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
      sentTo: result.sentTo,
      previewUrl: result.previewUrl ?? null,
      underwriterNotified,
    });
  } catch (err) {
    console.error("[POST /api/buy-policy] email send failed:", err);
    return NextResponse.json(
      { error: "Failed to send confirmation email" },
      { status: 500 }
    );
  }
}
