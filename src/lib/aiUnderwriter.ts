import OpenAI from "openai";
import { buildSubmissionSections, type SubmissionRecord } from "@/lib/submissionSections";

// ============================================================
// AI UNDERWRITER RECOMMENDATION (advisory)
// ============================================================
// Produces a typed verdict (approve/decline + confidence + reasons)
// for a REFERRED submission. A human underwriter still confirms.
//
// Engine is pluggable via the `UnderwriterEngine` interface below.
// The active engine is an INLINE OpenAI call (gpt-4o-mini, JSON output)
// — funded by OPENAI_API_KEY, which the app already uses elsewhere.
// A later Anthropic Agent-Skill engine (PDF + code execution) can be
// dropped in by swapping `activeEngine` without touching the route/UI.
// ============================================================

export type AiRecommendation = "approve" | "decline";

export interface UnderwriterVerdict {
  recommendation: AiRecommendation;
  confidence: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
}

// Submission fields the AI review needs (superset of SubmissionRecord).
export type AiSubmission = SubmissionRecord & {
  policyType: string;
  applicantName: string | null;
  province: string | null;
  annualPremium: number | null;
  coverageAmount: number | null;
  deductible: number | null;
  referralReasons: string | null;
};

// An engine takes the submission and returns a typed verdict.
type UnderwriterEngine = (sub: AiSubmission) => Promise<UnderwriterVerdict>;

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an expert Canadian property & casualty insurance underwriter assisting a broker portal called InsureFlow.

A quote has been REFERRED for manual underwriting review (it was neither auto-accepted nor auto-declined). You are given the application details, the product type, the premium/coverage, and the specific reasons it was referred.

Your job: recommend whether to APPROVE (bind the risk) or DECLINE it, using sound underwriting judgment.

Guidelines:
- Weigh the referral reasons most heavily — they are why a human was asked to look.
- Consider risk holistically: occupancy/vacancy, construction/age, heating (esp. solid-fuel/wood), electrical/plumbing, protection/security, loss history, coverage adequacy vs. value, and any red flags.
- Be conservative: if the risk is poor, or material information needed to price it is missing, lean DECLINE. If the risk is acceptable at the priced premium, recommend APPROVE.
- Set confidence to "low" when information is thin or finely balanced.
- This is advisory only; a human underwriter makes the final decision.

Reply with ONLY valid JSON, no markdown, in exactly this shape:
{"recommendation":"approve"|"decline","confidence":"low"|"medium"|"high","summary":"1-2 sentence rationale","reasons":["2-5 short specific reasons"]}`;

function fmtCAD(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(v);
}

function buildPolicyContext(sub: AiSubmission): string {
  const sections = buildSubmissionSections(sub);
  const detail = sections
    .map((s) => `## ${s.title}\n${s.rows.map((r) => `- ${r.label}: ${r.value}`).join("\n")}`)
    .join("\n\n");

  let referralReasons: string[] = [];
  try {
    referralReasons = JSON.parse(sub.referralReasons ?? "[]");
  } catch {
    referralReasons = [];
  }

  return [
    `Product: ${sub.policyType}`,
    `Applicant: ${sub.applicantName ?? "—"}`,
    `Province: ${sub.province ?? "—"}`,
    `Annual premium: ${fmtCAD(sub.annualPremium)}`,
    `Coverage amount: ${fmtCAD(sub.coverageAmount)}`,
    `Deductible: ${fmtCAD(sub.deductible)}`,
    ``,
    `Reasons this quote was referred:`,
    referralReasons.length ? referralReasons.map((r) => `- ${r}`).join("\n") : "- (none recorded)",
    ``,
    `Application details:`,
    detail,
  ].join("\n");
}

function isOpenAiKeySet(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key !== "your-openai-api-key-here");
}

// ── Inline OpenAI engine (active) ────────────────────────────
const openAiInlineEngine: UnderwriterEngine = async (sub) => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Review this referred insurance application and give your recommendation.\n\n${buildPolicyContext(sub)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<UnderwriterVerdict>;

  return {
    recommendation: parsed.recommendation === "decline" ? "decline" : "approve",
    confidence:
      parsed.confidence === "high" || parsed.confidence === "medium"
        ? parsed.confidence
        : "low",
    summary: parsed.summary ?? "",
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
  };
};

// Swap this to a future Anthropic Skill engine without touching callers.
const activeEngine: UnderwriterEngine = openAiInlineEngine;

export function isAiUnderwriterConfigured(): boolean {
  return isOpenAiKeySet();
}

export async function getAiUnderwriterVerdict(
  sub: AiSubmission
): Promise<UnderwriterVerdict> {
  return activeEngine(sub);
}
