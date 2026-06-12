import { Answer } from "@/types";
import { JEWELLER_QUESTIONS } from "@/data/jewellerQuestions";
import { PRODUCTS } from "@/data/products";

// Builds the product-specific detail sections for a saved submission.
// Vacant Home renders from typed columns; other products render
// generically from the allAnswers JSON, grouped by summarySection.
// Shared by the policy detail page and the PDF document route.

export interface ViewRow {
  label: string;
  value: string;
}
export interface ViewSection {
  title: string;
  rows: ViewRow[];
}

export interface SubmissionRecord {
  policyType: string;
  allAnswers: string;
  applicantName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  province: string | null;
  propertyAddress: string | null;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  propertyValue: number | null;
  coveragePercent: string | null;
  deductible: number | null;
  vacancyDuration: string | null;
  vacancyReason: string | null;
  inspectionFrequency: string | null;
  utilitiesWinterized: string | null;
  securityFeatures: string | null;
  hasPool: string | null;
  poolFenced: string | null;
  priorDamage: string | null;
  damageType: string | null;
  priorClaims: string | null;
  priorInsurance: string | null;
  broker?: { name: string | null; email: string | null } | null;
}

const VACANT_HOME = PRODUCTS["vacant-home"].policyType;

function fmt(v: string | number | null | undefined, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(v);
}

function yesNo(v: string | null | undefined): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return fmt(v);
}

function buildVacantHomeSections(s: SubmissionRecord): ViewSection[] {
  return [
    {
      title: "Applicant Information",
      rows: [
        { label: "Full Name", value: fmt(s.applicantName) },
        { label: "Email Address", value: fmt(s.contactEmail) },
        { label: "Phone Number", value: fmt(s.contactPhone) },
        { label: "Broker", value: fmt(s.broker?.name) },
        { label: "Broker Email", value: fmt(s.broker?.email) },
      ],
    },
    {
      title: "Property Details",
      rows: [
        { label: "Property Address", value: fmt(s.propertyAddress) },
        { label: "Province / Territory", value: fmt(s.province) },
        { label: "Property Type", value: fmt(s.propertyType) },
        { label: "Year Built", value: fmt(s.yearBuilt) },
        {
          label: "Square Footage",
          value: s.squareFootage != null ? `${s.squareFootage.toLocaleString()} sq ft` : "—",
        },
        { label: "Property Value", value: fmtCurrency(s.propertyValue) },
      ],
    },
    {
      title: "Vacancy Information",
      rows: [
        { label: "Vacancy Duration", value: fmt(s.vacancyDuration) },
        { label: "Reason for Vacancy", value: fmt(s.vacancyReason) },
      ],
    },
    {
      title: "Coverage Details",
      rows: [
        { label: "Coverage Percentage", value: fmt(s.coveragePercent) },
        { label: "Deductible", value: s.deductible != null ? fmtCurrency(s.deductible) : "—" },
      ],
    },
    {
      title: "Property Management",
      rows: [
        { label: "Inspection Frequency", value: fmt(s.inspectionFrequency) },
        { label: "Utilities Winterized", value: yesNo(s.utilitiesWinterized) },
        { label: "Security Features", value: fmt(s.securityFeatures) },
      ],
    },
    {
      title: "Property Features",
      rows: [
        { label: "Swimming Pool", value: yesNo(s.hasPool) },
        { label: "Pool Fenced", value: yesNo(s.poolFenced) },
      ],
    },
    {
      title: "Loss History",
      rows: [
        { label: "Prior Damage", value: yesNo(s.priorDamage) },
        { label: "Damage Type", value: fmt(s.damageType) },
        { label: "Prior Claims (5 yrs)", value: fmt(s.priorClaims) },
        { label: "Prior Insurance", value: yesNo(s.priorInsurance) },
      ],
    },
  ];
}

// Generic builder for products that store answers in allAnswers.
// Groups by each question's summarySection, preserving question order.
function buildGenericSections(
  s: SubmissionRecord,
  questions: typeof JEWELLER_QUESTIONS
): ViewSection[] {
  let answers: Record<string, Answer> = {};
  try {
    answers = JSON.parse(s.allAnswers ?? "{}");
  } catch {
    answers = {};
  }

  const order: string[] = [];
  const grouped: Record<string, ViewRow[]> = {};

  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer) continue;
    const section = q.summarySection ?? "Details";
    if (!grouped[section]) {
      grouped[section] = [];
      order.push(section);
    }
    grouped[section].push({
      label: q.summaryLabel ?? q.id,
      value: fmt(answer.displayValue),
    });
  }

  const sections: ViewSection[] = order.map((title) => ({ title, rows: grouped[title] }));

  if (s.broker?.name || s.broker?.email) {
    sections.push({
      title: "Broker",
      rows: [
        { label: "Broker", value: fmt(s.broker?.name) },
        { label: "Broker Email", value: fmt(s.broker?.email) },
      ],
    });
  }

  return sections;
}

export function buildSubmissionSections(s: SubmissionRecord): ViewSection[] {
  if (s.policyType === VACANT_HOME) return buildVacantHomeSections(s);
  if (s.policyType === PRODUCTS["jeweller-block"].policyType) {
    return buildGenericSections(s, JEWELLER_QUESTIONS);
  }
  return buildVacantHomeSections(s);
}
