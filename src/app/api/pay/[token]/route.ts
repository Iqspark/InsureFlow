import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPolicyConfirmationEmail, sendPaymentReceiptEmail } from "@/lib/email";

// POST /api/pay/[token]
// Public (no auth) — the applicant pays via the link emailed to them. Validates
// the card payload (format only — no real charge), marks the policy paid, and
// emails a confirmation + receipt.
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
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
    where: { paymentToken: params.token },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || !sub.purchased) {
    return NextResponse.json({ error: "Payment link is invalid" }, { status: 404 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const paidAt = new Date();
  const amount = sub.annualPremium ?? 0;

  await prisma.submission.update({
    where: { id: sub.id },
    data: { paymentStatus: "paid", paidAt, paidAmount: amount },
  });

  // Send the applicant confirmation + receipt (best-effort — payment recorded already)
  let previewUrl: string | null = null;
  const to = sub.contactEmail;
  if (to) {
    try {
      const confirm = await sendPolicyConfirmationEmail({
        to,
        applicantName:  sub.applicantName  ?? "Valued Customer",
        appId:          sub.id.slice(0, 10).toUpperCase(),
        policyType:     sub.policyType,
        province:       sub.province       ?? "Canada",
        annualPremium:  sub.annualPremium  ?? 0,
        monthlyPremium: sub.monthlyPremium ?? 0,
        coverageAmount: sub.coverageAmount ?? 0,
        deductible:     sub.deductible     ?? 0,
        brokerName:     sub.broker?.name   ?? "your broker",
        brokerEmail:    sub.broker?.email  ?? "",
      });
      const receipt = await sendPaymentReceiptEmail({
        to,
        applicantName: sub.applicantName ?? "Valued Customer",
        appId:         sub.id.slice(0, 10).toUpperCase(),
        policyType:    sub.policyType,
        amount,
        paidAt,
      });
      previewUrl = receipt.previewUrl ?? confirm.previewUrl ?? null;
    } catch (err) {
      console.error("[pay] confirmation/receipt email failed:", err);
    }
  }

  return NextResponse.json({ success: true, paidAmount: amount, previewUrl });
}
