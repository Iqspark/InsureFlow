import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { sendAdjustmentEmail } from "@/lib/email";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";

const MS_DAY = 86_400_000;

// POST /api/submissions/[id]/adjust
// Mid-term adjustment: revise the sum insured on a bound policy. Premium scales
// with the sum insured and the difference is charged/returned pro-rata for the
// remaining term. Owning broker or admin only.
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

  let coverageAmount: number, reason = "";
  try {
    const body = (await req.json()) as { coverageAmount?: number; reason?: string };
    coverageAmount = Number(body.coverageAmount);
    reason = (body.reason ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (!sub.purchased || sub.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Only paid policies can be adjusted" }, { status: 400 });
  }
  if (sub.cancelledAt) {
    return NextResponse.json({ error: "A cancelled policy cannot be adjusted" }, { status: 409 });
  }
  if (!coverageAmount || coverageAmount <= 0) {
    return NextResponse.json({ error: "Enter a valid coverage amount" }, { status: 400 });
  }

  const oldCoverage = sub.coverageAmount ?? 0;
  const oldAnnual = sub.annualPremium ?? 0;
  if (oldCoverage <= 0 || oldAnnual <= 0) {
    return NextResponse.json({ error: "This policy has no coverage/premium to adjust" }, { status: 400 });
  }
  if (Math.round(coverageAmount) === Math.round(oldCoverage)) {
    return NextResponse.json({ error: "New coverage is the same as the current coverage" }, { status: 400 });
  }

  // Premium scales with the sum insured (sum-insured-driven base premium).
  const newAnnual = Math.round((oldAnnual * coverageAmount) / oldCoverage);

  // Pro-rata the difference over the remaining term.
  const now = new Date();
  const effective = sub.effectiveAt ? new Date(sub.effectiveAt) : new Date(sub.createdAt);
  const expiry = sub.expiresAt
    ? new Date(sub.expiresAt)
    : new Date(effective.getTime() + 365 * MS_DAY);
  const termDays = Math.max(1, Math.round((expiry.getTime() - effective.getTime()) / MS_DAY));
  const remainingDays = Math.max(0, Math.round((expiry.getTime() - now.getTime()) / MS_DAY));
  const proRata = Math.round(((newAnnual - oldAnnual) * remainingDays) / termDays);

  // Append to the adjustment log.
  let log: unknown[] = [];
  try { log = JSON.parse(sub.adjustments ?? "[]"); } catch { log = []; }
  log.push({
    at: now.toISOString(),
    oldCoverage, newCoverage: Math.round(coverageAmount),
    oldAnnual, newAnnual, proRata, remainingDays, termDays,
    reason: reason || null,
  });

  await prisma.submission.update({
    where: { id: sub.id },
    data: {
      coverageAmount: Math.round(coverageAmount),
      annualPremium: newAnnual,
      monthlyPremium: Math.round(newAnnual / 12),
      adjustments: JSON.stringify(log),
    },
  });

  const cad = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
  await recordAudit({
    submissionId: sub.id,
    action: "adjusted",
    actorId: user.id,
    actorName: session.user.name ?? null,
    actorRole: user.role,
    detail: `Coverage ${cad(oldCoverage)} → ${cad(Math.round(coverageAmount))} · ${proRata >= 0 ? "+" : "−"}${cad(Math.abs(proRata))} pro-rata`,
  });

  // Email the applicant a confirmation (best-effort).
  let sentTo: string | null = null;
  let previewUrl: string | null = null;
  if (sub.contactEmail) {
    try {
      const sent = await sendAdjustmentEmail({
        to:            sub.contactEmail,
        applicantName: sub.applicantName ?? "Valued Customer",
        appId:         policyNumber(sub),
        policyType:    sub.policyType,
        oldCoverage, newCoverage: Math.round(coverageAmount),
        oldAnnual, newAnnual, proRata,
        reason,
        brokerName:    user.role === "ADMIN" ? "your broker" : (session.user.name ?? "your broker"),
      });
      sentTo = sent.sentTo;
      previewUrl = sent.previewUrl ?? null;
    } catch (err) {
      console.error("[adjust] confirmation email failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    newAnnual, oldAnnual, proRata, remainingDays,
    sentTo, previewUrl,
  });
}
