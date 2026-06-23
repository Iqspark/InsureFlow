import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { finalizePaidPolicy } from "@/lib/finalizePayment";

export const runtime = "nodejs";

// POST /api/stripe/webhook
// Stripe calls this when a Checkout Session completes. This is the ONLY place
// a Stripe payment marks a policy paid (the client redirect is not trusted).
// Locally, forward events with: stripe listen --forward-to localhost:3000/api/stripe/webhook
export async function POST(req: NextRequest) {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { submissionId?: string };
      client_reference_id?: string | null;
      payment_intent?: string | null;
      payment_status?: string;
    };
    const submissionId = session.metadata?.submissionId ?? session.client_reference_id ?? null;

    if (submissionId && session.payment_status === "paid") {
      const result = await finalizePaidPolicy(submissionId, {
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripeStatus: "paid",
      });
      if (!result.ok) {
        console.error("[stripe webhook] finalize failed:", submissionId, result.reason);
      }
    }
  }

  return NextResponse.json({ received: true });
}
