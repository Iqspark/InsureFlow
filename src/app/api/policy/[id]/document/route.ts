import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderPolicyPdf } from "@/lib/policyPdf";
import { buildSubmissionSections } from "@/lib/submissionSections";
import { staticMapUrl } from "@/utils/googleMaps";
import { policyNumber } from "@/utils/policyNumber";

export const runtime = "nodejs";

// Fetches the Google static map PNG and returns it as a base64 data URI
// so it can be embedded directly in the PDF. Returns null on any failure
// (no key, API disabled, network error) — the PDF still renders without it.
async function fetchMapDataUri(address: string | null): Promise<string | null> {
  if (!address) return null;
  const url = staticMapUrl(address);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// GET /api/policy/[id]/document
// Returns a generated PDF of the full quote/policy details as a direct
// file download (Content-Disposition: attachment).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { broker: { select: { name: true, email: true } } },
  });

  if (!sub || sub.brokerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appId = policyNumber(sub);
  const reasons: string[] =
    sub.decision === "decline"
      ? JSON.parse(sub.declineReasons ?? "[]")
      : JSON.parse(sub.referralReasons ?? "[]");

  const mapImage = await fetchMapDataUri(sub.propertyAddress);

  const pdf = await renderPolicyPdf({
    appId,
    policyType: sub.policyType,
    applicantName: sub.applicantName,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    decision: sub.decision,
    purchased: sub.purchased,
    reasons,
    annualPremium: sub.annualPremium,
    monthlyPremium: sub.monthlyPremium,
    coverageAmount: sub.coverageAmount,
    sections: buildSubmissionSections(sub),
    propertyAddress: sub.propertyAddress,
    mapImage,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="InsureFlow-Policy-${appId}.pdf"`,
    },
  });
}
