import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Answer } from "@/types";

// ── POST /api/drafts ──────────────────────────────────────────
// Upserts a draft submission. Pass draftId to update an existing
// draft, omit it to create a new one.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      answers: Record<string, Answer>;
      sessionId?: string;
      draftId?: string;
    };

    const { answers, sessionId, draftId } = body;

    const authSession = await getServerSession(authOptions);
    const brokerId = authSession?.user?.id ?? null;

    const get = (id: string) => answers[id]?.value;
    const getString = (id: string) => String(get(id) ?? "");
    const getNumber = (id: string) => {
      const v = get(id);
      return v !== undefined ? Number(v) : undefined;
    };

    const data = {
      brokerId,
      sessionId: sessionId ?? null,
      status: "draft",
      applicantName: getString("applicant_name") || null,
      contactEmail:  getString("contact_email") || null,
      province:      getString("property_province") || null,
      propertyType:  getString("property_type") || null,
      yearBuilt:     getNumber("year_built") ? Math.round(getNumber("year_built")!) : null,
      squareFootage: getNumber("square_footage") ? Math.round(getNumber("square_footage")!) : null,
      propertyValue: getNumber("property_value") ?? null,
      allAnswers:    JSON.stringify(answers),
    };

    let id: string;
    if (draftId) {
      const updated = await prisma.submission.update({
        where: { id: draftId },
        data,
        select: { id: true },
      });
      id = updated.id;
    } else {
      const created = await prisma.submission.create({
        data,
        select: { id: true },
      });
      id = created.id;
    }

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[POST /api/drafts]", err);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
