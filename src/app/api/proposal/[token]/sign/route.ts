import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { tooMany, clientIp } from "@/lib/rateLimit";
import { isPortalTokenExpired } from "@/lib/portalToken";
import { DECLARATION_VERSION, proposalDocumentHash } from "@/lib/proposal";
import { captureError } from "@/lib/observability";

const MAX_NAME = 120;

// POST /api/proposal/[token]/sign
// Public: the applicant e-signs the proposal. Authorised by the unguessable
// proposal token. Captures the signature evidence (name, IP, UA, document hash)
// and moves the submission to coverageStatus=signed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const limited = tooMany(`proposal-sign:${clientIp(req)}`, 10, 60_000);
  if (limited) return limited;

  let signerName: string, consent: boolean;
  try {
    const body = (await req.json()) as { signerName?: string; consent?: boolean };
    signerName = (body.signerName ?? "").trim();
    consent = body.consent === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!signerName) {
    return NextResponse.json({ error: "Please type your full name to sign." }, { status: 400 });
  }
  if (signerName.length > MAX_NAME) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Please confirm you accept the declaration." }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({ where: { proposalToken: token } });
  if (!sub || sub.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isPortalTokenExpired(sub.proposalTokenExpiresAt, new Date())) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }
  if (sub.coverageStatus === "signed" || sub.coverageStatus === "bound") {
    return NextResponse.json({ error: "This proposal has already been signed." }, { status: 409 });
  }
  if (sub.coverageStatus !== "awaiting_signature") {
    return NextResponse.json({ error: "This proposal is not awaiting signature." }, { status: 409 });
  }

  try {
    const documentHash = proposalDocumentHash({
      policyType:     sub.policyType,
      applicantName:  sub.applicantName,
      province:       sub.province,
      decision:       sub.decision,
      annualPremium:  sub.annualPremium,
      monthlyPremium: sub.monthlyPremium,
      coverageAmount: sub.coverageAmount,
      deductible:     sub.deductible,
    });

    const now = new Date();
    await prisma.submission.update({
      where: { id: sub.id },
      data: {
        coverageStatus: "signed",
        signedAt: now,
        signatures: {
          create: {
            signerName,
            method: "typed",
            signatureRef: signerName,
            declarationVersion: DECLARATION_VERSION,
            documentHash,
            ip: clientIp(req),
            userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
            signedAt: now,
          },
        },
      },
    });

    await recordAudit({
      submissionId: sub.id,
      action: "signed",
      actorName: signerName,
      actorRole: "CUSTOMER",
      detail: `Proposal e-signed (declaration v${DECLARATION_VERSION})`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    captureError(err, { area: "payment", message: "proposal sign failed", extra: { submissionId: sub.id } });
    return NextResponse.json({ error: "Could not record your signature. Please try again." }, { status: 500 });
  }
}
