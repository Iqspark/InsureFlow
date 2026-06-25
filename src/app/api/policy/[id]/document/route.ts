import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPolicyPdf } from "@/lib/policyDocument";
import { policyNumber } from "@/utils/policyNumber";
import { canViewSubmission, type SessionUser } from "@/lib/access";

export const runtime = "nodejs";

// GET /api/policy/[id]/document
// Returns a generated PDF of the full quote/policy details as a direct
// file download (Content-Disposition: attachment).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || !canViewSubmission(session.user as unknown as SessionUser, sub)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appId = policyNumber(sub);
  const pdf = await buildPolicyPdf(sub);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="InsureFlow-Policy-${appId}.pdf"`,
    },
  });
}
