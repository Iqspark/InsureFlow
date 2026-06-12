import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Answer, QuoteDetails } from "@/types";

// ── POST /api/submissions ─────────────────────────────────────
// Called by the client after a quote is calculated.
// Saves the full answers + result to the database.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      answers: Record<string, Answer>;
      quoteDetails: QuoteDetails;
      sessionId?: string;
      draftId?: string;
      policyType?: string;
    };

    const { answers, quoteDetails, sessionId, draftId, policyType } = body;

    if (!answers || !quoteDetails) {
      return NextResponse.json(
        { error: "answers and quoteDetails are required" },
        { status: 400 }
      );
    }

    // Attach the authenticated broker to the submission
    const authSession = await getServerSession(authOptions);
    const brokerId    = authSession?.user?.id ?? null;

    const get = (id: string) => answers[id]?.value;
    const getString = (id: string) => String(get(id) ?? "");
    const getNumber = (id: string) => {
      const v = get(id);
      return v !== undefined ? Number(v) : undefined;
    };

    const submissionData = {
      brokerId:  brokerId,
      policyType: policyType ?? "Vacant Home Insurance",
      sessionId: sessionId ?? null,
      status: "complete",

      // Contact
      applicantName:  getString("applicant_name") || null,
      contactEmail:   getString("contact_email") || null,
      contactPhone:   getString("contact_phone") || null,

      // Location
      province:        getString("property_province") || null,
      propertyAddress: getString("property_address") || null,
      propertyType:    getString("property_type") || null,

      // Property details
      yearBuilt:     getNumber("year_built") ? Math.round(getNumber("year_built")!) : null,
      squareFootage: getNumber("square_footage") ? Math.round(getNumber("square_footage")!) : null,
      propertyValue: getNumber("property_value") ?? null,

      // Coverage
      coveragePercent: getString("coverage_amount") || null,
      deductible:      getNumber("deductible") ?? null,

      // Vacancy
      vacancyDuration: getString("vacancy_duration") || null,
      vacancyReason:   getString("vacancy_reason") || null,

      // Management
      inspectionFrequency: getString("property_inspections") || null,
      utilitiesWinterized: getString("utilities_winterized") || null,
      securityFeatures:    getString("security_features") || null,

      // Features
      hasPool:    getString("has_pool") || null,
      poolFenced: getString("pool_fenced") || null,

      // Loss history
      priorDamage:    getString("prior_damage") || null,
      damageType:     getString("damage_type") || null,
      priorClaims:    getString("prior_claims") || null,
      priorInsurance: getString("prior_insurance") || null,

      // Raw answers blob
      allAnswers: JSON.stringify(answers),

      // Result
      decision:       quoteDetails.decision,
      annualPremium:  quoteDetails.finalAnnualPremium ?? null,
      monthlyPremium: quoteDetails.finalMonthlyPremium ?? null,
      coverageAmount: quoteDetails.coverageAmount ?? null,
      declineReasons:  JSON.stringify(quoteDetails.declineReasons ?? []),
      referralReasons: JSON.stringify(quoteDetails.referralReasons ?? []),
    };

    // If a draft exists for this session, promote it to complete
    const submission = draftId
      ? await prisma.submission.update({ where: { id: draftId }, data: submissionData })
      : await prisma.submission.create({ data: submissionData });

    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/submissions]", err);
    return NextResponse.json(
      { error: "Failed to save submission" },
      { status: 500 }
    );
  }
}

// ── GET /api/submissions ──────────────────────────────────────
// Returns a paginated list of submissions (newest first).
// Query params: ?page=1&limit=20&decision=accept&province=ON
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const decision = searchParams.get("decision") ?? undefined;
    const province = searchParams.get("province") ?? undefined;
    const email    = searchParams.get("email") ?? undefined;

    const where = {
      ...(decision ? { decision } : {}),
      ...(province ? { province } : {}),
      ...(email    ? { contactEmail: { contains: email } } : {}),
    };

    const [total, submissions] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id:             true,
          createdAt:      true,
          applicantName:  true,
          contactEmail:   true,
          province:       true,
          propertyType:   true,
          propertyValue:  true,
          vacancyDuration: true,
          decision:       true,
          annualPremium:  true,
          monthlyPremium: true,
          coverageAmount: true,
          declineReasons:  true,
          referralReasons: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: submissions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/submissions]", err);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
