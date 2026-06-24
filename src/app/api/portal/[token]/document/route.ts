import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPolicyPdf } from "@/lib/policyDocument";
import { policyNumber } from "@/utils/policyNumber";

export const runtime = "nodejs";

// GET /api/portal/[token]/document
// Public download of the policy PDF, authorised by the unguessable payment
// token (the same token the customer received by email). No login.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const sub = await prisma.submission.findUnique({ where: { paymentToken: token } });
  if (!sub || !sub.purchased) {
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
