import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDecideReview, type SessionUser } from "@/lib/access";
import { sendQuoteApprovedEmail } from "@/lib/email";
import { publicBaseUrl } from "@/lib/baseUrl";
import { policyNumber } from "@/utils/policyNumber";
import { recordAudit } from "@/lib/audit";

// POST /api/submissions/[id]/review
// Underwriter approves or declines a referred submission (admins are read-only).
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
  if (!canDecideReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let action: string, note: string;
  try {
    ({ action, note } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'" }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (sub.decision !== "refer") {
    return NextResponse.json({ error: "Only referred quotes can be reviewed" }, { status: 400 });
  }

  const reviewNote = (note ?? "").toString().trim();
  const decision = action === "approve" ? "accept" : "decline";

  await prisma.submission.update({
    where: { id: sub.id },
    data: {
      decision,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });

  await recordAudit({
    submissionId: sub.id,
    action: "reviewed",
    actorId: user.id,
    actorName: session.user.name ?? null,
    actorRole: user.role,
    detail: `${action === "approve" ? "Approved" : "Declined"}${reviewNote ? ` · ${reviewNote}` : ""}`,
  });

  // Notify the broker on approval (best-effort — never block the review)
  let brokerNotified = false;
  let previewUrl: string | null = null;
  if (action === "approve" && sub.broker?.email) {
    try {
      const origin = publicBaseUrl(req);
      const result = await sendQuoteApprovedEmail({
        to:            sub.broker.email,
        brokerName:    sub.broker.name ?? "there",
        applicantName: sub.applicantName ?? "the applicant",
        appId:         policyNumber(sub),
        policyType:    sub.policyType,
        annualPremium: sub.annualPremium ?? 0,
        reviewNote,
        policyUrl:     `${origin}/policy/${sub.id}`,
      });
      brokerNotified = true;
      previewUrl = result.previewUrl ?? null;
    } catch (err) {
      console.error("[review] broker notification failed:", err);
    }
  }

  return NextResponse.json({ success: true, decision, brokerNotified, previewUrl });
}
