import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendChangeRequestEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { tooMany, clientIp } from "@/lib/rateLimit";

const MAX_MESSAGE = 2000;

// POST /api/portal/[token]/request
// Public: a customer submits a change request for their policy. Authorised by
// the unguessable payment token. Emails the broker and logs an audit event.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const limited = tooMany(`portal-request:${clientIp(req)}`, 5, 60_000);
  if (limited) return limited;

  let message: string;
  try {
    ({ message } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  message = (message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Please describe the change you'd like." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({
    where: { paymentToken: token },
    include: { broker: { select: { name: true, email: true } } },
  });
  if (!sub || !sub.purchased) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await recordAudit({
    submissionId: sub.id,
    action: "change_requested",
    actorName: sub.applicantName ?? "Customer",
    actorRole: "CUSTOMER",
    detail: message.length > 140 ? `${message.slice(0, 140)}…` : message,
  });

  if (sub.broker?.email) {
    try {
      await sendChangeRequestEmail({
        to:            sub.broker.email,
        brokerName:    sub.broker.name ?? "there",
        applicantName: sub.applicantName ?? "A customer",
        appId:         policyNumber(sub),
        policyType:    sub.policyType,
        message,
        policyUrl:     `${publicBaseUrl(req)}/policy/${sub.id}`,
      });
    } catch (err) {
      console.error("[portal request] broker email failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}
