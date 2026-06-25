import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBindOrPay, type SessionUser } from "@/lib/access";
import { finalizePaidPolicy } from "@/lib/finalizePayment";
import { isOfflinePaymentMethod } from "@/lib/paymentMethods";
import { tooMany } from "@/lib/rateLimit";

const MAX_REF = 120;

// POST /api/submissions/[id]/record-payment
// Broker records a payment received outside the online checkout (cash, cheque,
// EFT, pre-authorized debit, etc.) — marks the policy paid, stops dunning,
// reinstates a pending cancellation, and emails the receipt. Owner/admin only.
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

  const limited = tooMany(`record-payment:${id}`, 10, 60_000);
  if (limited) return limited;

  let method: string, amount: number | undefined, reference: string | null;
  try {
    const body = (await req.json()) as { method?: string; amount?: number; reference?: string };
    method = body.method ?? "";
    amount = typeof body.amount === "number" ? body.amount : undefined;
    reference = (body.reference ?? "").trim().slice(0, MAX_REF) || null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isOfflinePaymentMethod(method)) {
    return NextResponse.json({ error: "Select a valid payment method" }, { status: 400 });
  }
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, brokerId: true, deletedAt: true, purchased: true, paymentStatus: true },
  });

  if (!sub || sub.deletedAt || !canBindOrPay(user, sub)) {
    return NextResponse.json({ error: "Submission not found or not yours" }, { status: 404 });
  }
  if (!sub.purchased) {
    return NextResponse.json({ error: "This policy isn't bound yet" }, { status: 409 });
  }
  if (sub.paymentStatus === "paid") {
    return NextResponse.json({ error: "This policy is already paid" }, { status: 409 });
  }

  const result = await finalizePaidPolicy(sub.id, {
    method,
    reference,
    recordedByName: session.user.name ?? null,
    recordedByRole: user.role,
    ...(amount !== undefined ? { paidAmount: amount } : {}),
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Could not record the payment" }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    alreadyPaid: result.alreadyPaid,
    amount: result.amount,
    previewUrl: result.previewUrl,
  });
}
