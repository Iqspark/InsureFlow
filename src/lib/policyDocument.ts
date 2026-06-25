import type { Submission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderPolicyPdf } from "@/lib/policyPdf";
import { buildSubmissionSections } from "@/lib/submissionSections";
import { staticMapUrl } from "@/utils/googleMaps";
import { policyNumber } from "@/utils/policyNumber";

// Fetches the Google static map PNG as a base64 data URI for embedding in the
// PDF. Returns null on any failure (no key, API disabled, network) — the PDF
// still renders without it.
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

// Renders the full branded quote/policy PDF for a submission. Shared by the
// document download route and the payment-receipt email.
export async function buildPolicyPdf(sub: Submission): Promise<Buffer> {
  const reasons: string[] =
    sub.decision === "decline"
      ? JSON.parse(sub.declineReasons ?? "[]")
      : JSON.parse(sub.referralReasons ?? "[]");

  const mapImage = await fetchMapDataUri(sub.propertyAddress);

  // Latest e-signature (if the proposal was signed) → certificate block in the PDF.
  const sig = await prisma.policySignature.findFirst({
    where: { submissionId: sub.id },
    orderBy: { signedAt: "desc" },
  });

  return renderPolicyPdf({
    appId: policyNumber(sub),
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
    signature: sig
      ? {
          signerName: sig.signerName,
          method: sig.method,
          signedAt: sig.signedAt,
          declarationVersion: sig.declarationVersion,
          documentHash: sig.documentHash,
        }
      : null,
  });
}
