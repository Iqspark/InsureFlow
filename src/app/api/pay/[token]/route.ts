import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizePaidPolicy } from "@/lib/finalizePayment";
import { isStripeConfigured } from "@/lib/stripe";
import { tooMany, clientIp } from "@/lib/rateLimit";
import { isPortalTokenExpired } from "@/lib/portalToken";

// POST /api/pay/[token]
// Public (no auth) — simulated fallback checkout, used ONLY when Stripe is NOT
// configured. Validates the card payload (format only — no real charge), marks
// the policy paid, and emails a confirmation + receipt. When STRIPE_SECRET_KEY
// is set, real payment must go through /api/pay/[token]/checkout + the Stripe
// webhook, so this route is disabled to prevent a no-charge payment bypass.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const limited = tooMany(`pay:${clientIp(req)}`, 15, 60_000);
  if (limited) return limited;

  // Hard guard: never accept the simulated (no-charge) payment when Stripe is live.
  if (isStripeConfigured()) {
    return NextResponse.json(
      { error: "This payment must be completed through secure checkout." },
      { status: 400 }
    );
  }

  let cardNumber: string, expiry: string, cvc: string;
  try {
    ({ cardNumber, expiry, cvc } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const digits = (cardNumber ?? "").replace(/\s+/g, "");
  if (!/^\d{15,16}$/.test(digits)) {
    return NextResponse.json({ error: "Enter a valid card number" }, { status: 400 });
  }
  if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry ?? "")) {
    return NextResponse.json({ error: "Enter expiry as MM/YY" }, { status: 400 });
  }
  if (!/^\d{3,4}$/.test(cvc ?? "")) {
    return NextResponse.json({ error: "Enter a valid CVC" }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({
    where: { paymentToken: token },
    select: { id: true, purchased: true, paymentStatus: true, paymentTokenExpiresAt: true },
  });

  if (!sub || !sub.purchased) {
    return NextResponse.json({ error: "Payment link is invalid" }, { status: 404 });
  }
  if (isPortalTokenExpired(sub.paymentTokenExpiresAt, new Date())) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const result = await finalizePaidPolicy(sub.id);
  if (!result.ok) {
    return NextResponse.json({ error: "Payment link is invalid" }, { status: 404 });
  }

  return NextResponse.json({ success: true, paidAmount: result.amount, previewUrl: result.previewUrl });
}
