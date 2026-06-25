import { prisma } from "@/lib/prisma";
import { sendPolicyConfirmationEmail, sendPaymentReceiptEmail, sendReinstatementEmail } from "@/lib/email";
import { buildPolicyPdf } from "@/lib/policyDocument";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";
import { captureError } from "@/lib/observability";

type StripeMeta = {
  stripePaymentIntentId?: string | null;
  stripeStatus?: string | null;
};

export type FinalizeResult =
  | { ok: false; reason: "not_found" | "not_bound" }
  | { ok: true; alreadyPaid: boolean; amount: number; previewUrl: string | null };

// Marks a bound policy as paid and emails confirmation + receipt.
// Idempotent: a second call on an already-paid policy is a no-op.
// Shared by the simulated pay route and the Stripe webhook.
export async function finalizePaidPolicy(
  submissionId: string,
  opts: { paidAt?: Date; paidAmount?: number } & StripeMeta = {}
): Promise<FinalizeResult> {
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub) return { ok: false, reason: "not_found" };
  if (!sub.purchased) return { ok: false, reason: "not_bound" };

  // Record what was actually charged when the caller knows it (Stripe), falling
  // back to the policy premium for the simulated path.
  const amount = opts.paidAmount ?? sub.annualPremium ?? 0;

  if (sub.paymentStatus === "paid") {
    return { ok: true, alreadyPaid: true, amount, previewUrl: null };
  }

  const paidAt = opts.paidAt ?? new Date();
  // Atomic claim: only the first finalizer flips unpaid→paid, so concurrent
  // callers (webhook + the /pay return-page reconciler) can't double-send emails.
  const claimed = await prisma.submission.updateMany({
    where: { id: sub.id, paymentStatus: { not: "paid" } },
    data: {
      paymentStatus: "paid",
      paidAt,
      paidAmount: amount,
      ...(opts.stripePaymentIntentId ? { stripePaymentIntentId: opts.stripePaymentIntentId } : {}),
      ...(opts.stripeStatus ? { stripeStatus: opts.stripeStatus } : {}),
    },
  });
  if (claimed.count === 0) {
    // Another concurrent finalizer already marked it paid — no-op (no duplicate email).
    return { ok: true, alreadyPaid: true, amount, previewUrl: null };
  }

  const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(amount);
  await recordAudit({
    submissionId: sub.id,
    action: "paid",
    actorName: "Customer",
    actorRole: "CUSTOMER",
    detail: `Payment received · ${cad}`,
  });

  const to = sub.contactEmail;

  // Reinstate if this payment cleared a pending cancellation within the notice
  // window (the dunning job hasn't cancelled yet).
  if (sub.coverageStatus === "pending_cancellation") {
    await prisma.submission.update({
      where: { id: sub.id },
      data: { coverageStatus: "bound", cancellationNoticeAt: null, cancellationEffectiveAt: null },
    });
    await recordAudit({
      submissionId: sub.id,
      action: "reinstated",
      actorName: "Customer",
      actorRole: "CUSTOMER",
      detail: "Reinstated on payment within the notice window",
    });
    if (to) {
      try {
        await sendReinstatementEmail({
          to,
          applicantName: sub.applicantName ?? "Valued Customer",
          appId:         policyNumber(sub),
          policyType:    sub.policyType,
        });
      } catch (err) {
        captureError(err, { area: "email", message: "reinstatement email failed", extra: { submissionId: sub.id } });
      }
    }
  }

  // Best-effort emails — the payment is already recorded.
  let previewUrl: string | null = null;
  if (to) {
    try {
      // The e-sign flow already issued the full policy at bind (policyIssuedAt),
      // so payment only sends a receipt. The legacy flow issues the policy here.
      let confirmPreview: string | null = null;
      if (!sub.policyIssuedAt) {
        const confirm = await sendPolicyConfirmationEmail({
          to,
          applicantName:  sub.applicantName  ?? "Valued Customer",
          appId:          policyNumber(sub),
          policyType:     sub.policyType,
          province:       sub.province       ?? "Canada",
          annualPremium:  sub.annualPremium  ?? 0,
          monthlyPremium: sub.monthlyPremium ?? 0,
          coverageAmount: sub.coverageAmount ?? 0,
          deductible:     sub.deductible     ?? 0,
          brokerName:     sub.broker?.name   ?? "your broker",
          brokerEmail:    sub.broker?.email  ?? "",
        });
        confirmPreview = confirm.previewUrl ?? null;
      }
      // Best-effort branded policy PDF attached to the receipt.
      let pdf;
      try {
        const buffer = await buildPolicyPdf(sub);
        pdf = { filename: `InsureFlow-Policy-${policyNumber(sub)}.pdf`, content: buffer };
      } catch (pdfErr) {
        captureError(pdfErr, { area: "email", message: "policy PDF render failed", extra: { submissionId: sub.id } });
      }
      const receipt = await sendPaymentReceiptEmail({
        to,
        applicantName: sub.applicantName ?? "Valued Customer",
        appId:         policyNumber(sub),
        policyType:    sub.policyType,
        amount,
        paidAt,
        pdf,
      });
      previewUrl = receipt.previewUrl ?? confirmPreview ?? null;
    } catch (err) {
      captureError(err, { area: "email", message: "confirmation/receipt email failed", extra: { submissionId: sub.id } });
    }
  }

  return { ok: true, alreadyPaid: false, amount, previewUrl };
}
