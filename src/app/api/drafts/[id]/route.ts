import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authSession = await getServerSession(authOptions);
    const brokerId = authSession?.user?.id;
    if (!brokerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const draft = await prisma.submission.findUnique({
      where: { id },
      select: { allAnswers: true, brokerId: true, status: true },
    });

    if (!draft || draft.brokerId !== brokerId || draft.status !== "draft") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ answers: JSON.parse(draft.allAnswers) });
  } catch (err) {
    console.error("[GET /api/drafts/[id]]", err);
    return NextResponse.json({ error: "Failed to load draft" }, { status: 500 });
  }
}
