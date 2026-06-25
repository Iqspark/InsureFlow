import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { tooMany, clientIp } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

// POST /api/pay/[token]/checkout
// Public — creates a Stripe Checkout Session for the bound policy and returns
// its hosted URL. The webhook (/api/stripe/webhook) is what actually marks the
// policy paid once Stripe confirms. Only used when STRIPE_SECRET_KEY is set.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const limited = tooMany(`checkout:${clientIp(req)}`, 15, 60_000);
  if (limited) return limited;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const sub = await prisma.submission.findUnique({
    where: { paymentToken: token },
    select: {
      id: true, purchased: true, paymentStatus: true, annualPremium: true,
      policyType: true, applicantName: true, contactEmail: true, createdAt: true,
    },
  });

  if (!sub || !sub.purchased) {
    return NextResponse.json({ error: "Payment link is invalid" }, { status: 404 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const amount = sub.annualPremium ?? 0;
  if (amount <= 0) {
    return NextResponse.json({ error: "No amount due" }, { status: 400 });
  }

  const origin = publicBaseUrl(req);
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: sub.contactEmail ?? undefined,
      client_reference_id: sub.id,
      metadata: { submissionId: sub.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `${sub.policyType} — Policy ${policyNumber(sub)}`,
              description: sub.applicantName ? `Annual premium for ${sub.applicantName}` : undefined,
            },
          },
        },
      ],
      success_url: `${origin}/pay/${token}?paid=1`,
      cancel_url: `${origin}/pay/${token}`,
    });

    await prisma.submission.update({
      where: { id: sub.id },
      data: { stripeSessionId: session.id, stripeStatus: "checkout_created" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    captureError(err, { area: "payment", message: "Stripe checkout session creation failed", extra: { submissionId: sub.id } });
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
