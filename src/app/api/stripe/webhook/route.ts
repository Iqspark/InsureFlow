import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { finalizePaidPolicy } from "@/lib/finalizePayment";
import { tooMany, clientIp } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";

// POST /api/stripe/webhook
// Stripe calls this when a Checkout Session completes. This is the ONLY place
// a Stripe payment marks a policy paid (the client redirect is not trusted).
// Locally, forward events with: stripe listen --forward-to localhost:3000/api/stripe/webhook
export async function POST(req: NextRequest) {
  // Generous limit — Stripe retries on non-2xx, so the occasional 429 is safe.
  const limited = tooMany(`webhook:${clientIp(req)}`, 240, 60_000);
  if (limited) return limited;

  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Dedup: claim this event id. A redelivered/replayed event hits the unique
  // constraint and is acknowledged without reprocessing.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        metadata?: { submissionId?: string };
        client_reference_id?: string | null;
        payment_intent?: string | null;
        payment_status?: string;
        amount_total?: number | null;
      };
      const submissionId = session.metadata?.submissionId ?? session.client_reference_id ?? null;

      if (submissionId && session.payment_status === "paid") {
        // Amount verification: the charged total should match the policy premium.
        // We set the amount server-side at session creation, so a mismatch is
        // unexpected — record it for audit but still honor the confirmed payment.
        const sub = await prisma.submission.findUnique({
          where: { id: submissionId },
          select: { annualPremium: true },
        });
        const expectedCents = Math.round((sub?.annualPremium ?? 0) * 100);
        const mismatch =
          typeof session.amount_total === "number" &&
          expectedCents > 0 &&
          session.amount_total !== expectedCents;
        if (mismatch) {
          console.error(
            `[stripe webhook] amount mismatch for ${submissionId}: charged ${session.amount_total}¢, expected ${expectedCents}¢`
          );
        }

        const result = await finalizePaidPolicy(submissionId, {
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          stripeStatus: mismatch ? "paid_amount_mismatch" : "paid",
          // Record the amount Stripe actually captured (truth), not the expected premium.
          paidAmount: typeof session.amount_total === "number" ? session.amount_total / 100 : undefined,
        });
        if (!result.ok) {
          console.error("[stripe webhook] finalize skipped:", submissionId, result.reason);
        }
      }
    }
  } catch (err) {
    // Unexpected failure — release the dedup claim so Stripe's retry can reprocess.
    captureError(err, { area: "webhook", message: "processing error", extra: { eventId: event.id, type: event.type } });
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
