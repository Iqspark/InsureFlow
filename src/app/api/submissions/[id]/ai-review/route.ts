import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReview, type SessionUser } from "@/lib/access";
import { getAiUnderwriterVerdict, isAiUnderwriterConfigured } from "@/lib/aiUnderwriter";

export const runtime = "nodejs";

// POST /api/submissions/[id]/ai-review
// Underwriter/Admin: produce an advisory AI verdict (approve/decline +
// confidence + reasons) for a referred submission. The human confirms.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(session.user as unknown as SessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isAiUnderwriterConfigured()) {
    return NextResponse.json(
      { error: "AI review is not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { broker: { select: { name: true, email: true } } },
  });
  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (sub.decision !== "refer") {
    return NextResponse.json({ error: "Only referred quotes can be AI-reviewed" }, { status: 400 });
  }

  try {
    const verdict = await getAiUnderwriterVerdict(sub);
    return NextResponse.json({ success: true, verdict });
  } catch (err) {
    console.error("[ai-review] review failed:", err);
    return NextResponse.json({ error: "AI review failed. Please try again." }, { status: 502 });
  }
}
