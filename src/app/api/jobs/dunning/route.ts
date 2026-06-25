import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPaymentReminderEmail, sendCancellationEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { reminderStageFor, earnedPremium } from "@/lib/netTerms";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";

const BATCH = 200;

function secretOk(provided: string | null): boolean {
  const secret = process.env.JOBS_SECRET;
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/jobs/dunning
// Time-driven dunning, run daily by an external scheduler (Azure timer/WebJob,
// GitHub Actions schedule, or a cron service). Authorised by the JOBS_SECRET
// header. Idempotent: (1) sends due/+3/+7 payment reminders once per stage, and
// (2) cancels pending_cancellation policies whose notice window has elapsed while
// still unpaid. (Phase D.)
export async function POST(req: NextRequest) {
  if (!process.env.JOBS_SECRET) {
    return NextResponse.json({ error: "Dunning job is not configured" }, { status: 503 });
  }
  if (!secretOk(req.headers.get("x-jobs-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const baseUrl = publicBaseUrl(req);
  let remindersSent = 0;
  let cancelled = 0;

  // ── 1. Reminders ────────────────────────────────────────────
  const dueUnpaid = await prisma.submission.findMany({
    where: { coverageStatus: "bound", paymentStatus: "unpaid", deletedAt: null, dueAt: { not: null } },
    take: BATCH,
  });
  for (const sub of dueUnpaid) {
    if (!sub.dueAt || !sub.paymentToken) continue;
    const stage = reminderStageFor(sub.dueAt, now);
    if (stage <= sub.reminderStage) continue; // already sent this stage (idempotent)
    try {
      await sendPaymentReminderEmail({
        to:            sub.contactEmail ?? "",
        applicantName: sub.applicantName ?? "Valued Customer",
        appId:         policyNumber(sub),
        policyType:    sub.policyType,
        amount:        sub.annualPremium ?? 0,
        payUrl:        `${baseUrl}/pay/${sub.paymentToken}`,
        dueAt:         sub.dueAt,
      });
      await prisma.submission.update({
        where: { id: sub.id },
        data: { reminderStage: stage, lastReminderAt: now },
      });
      remindersSent++;
    } catch (err) {
      captureError(err, { area: "email", message: "dunning reminder failed", extra: { submissionId: sub.id } });
    }
  }

  // ── 2. Auto-cancel past the notice window ───────────────────
  const dueForCancel = await prisma.submission.findMany({
    where: {
      coverageStatus: "pending_cancellation",
      paymentStatus: "unpaid",
      deletedAt: null,
      cancellationEffectiveAt: { lte: now },
    },
    include: { broker: { select: { name: true } } },
    take: BATCH,
  });
  for (const sub of dueForCancel) {
    const effectiveAt = sub.cancellationEffectiveAt ?? now;
    const earned =
      sub.annualPremium && sub.effectiveAt && sub.expiresAt
        ? earnedPremium(sub.annualPremium, sub.effectiveAt, sub.expiresAt, effectiveAt)
        : null;
    try {
      const claimed = await prisma.submission.updateMany({
        where: { id: sub.id, coverageStatus: "pending_cancellation", paymentStatus: { not: "paid" } },
        data: {
          coverageStatus: "cancelled",
          cancelledAt: effectiveAt,
          cancelReason: "Non-payment",
          ...(earned != null ? { earnedPremiumOwed: earned } : {}),
        },
      });
      if (claimed.count === 0) continue; // paid/reinstated concurrently
      await recordAudit({
        submissionId: sub.id,
        action: "cancelled",
        actorName: "System",
        actorRole: "SYSTEM",
        detail: `Cancelled for non-payment${earned != null ? ` · earned premium owed ${earned}` : ""}`,
      });
      if (sub.contactEmail) {
        await sendCancellationEmail({
          to:            sub.contactEmail,
          applicantName: sub.applicantName ?? "Valued Customer",
          appId:         policyNumber(sub),
          policyType:    sub.policyType,
          cancelledAt:   effectiveAt,
          reason:        "Non-payment of premium",
          brokerName:    sub.broker?.name ?? "your broker",
        });
      }
      cancelled++;
    } catch (err) {
      captureError(err, { area: "payment", message: "dunning cancel failed", extra: { submissionId: sub.id } });
    }
  }

  return NextResponse.json({ ok: true, remindersSent, cancelled });
}
