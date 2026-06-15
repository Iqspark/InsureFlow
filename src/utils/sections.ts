import { Question } from "@/types";

// Short section label for a question — used by the progress rail.
// Jeweller questions carry `summarySection`; vacant-home questions
// fall back to this id → section map.
const VACANT_SECTION_MAP: Record<string, string> = {
  applicant_name: "About You",
  property_province: "Property",
  property_address: "Property",
  property_type: "Property",
  year_built: "Property",
  square_footage: "Property",
  property_value: "Valuation",
  coverage_amount: "Coverage",
  deductible: "Coverage",
  vacancy_duration: "Vacancy",
  vacancy_reason: "Vacancy",
  property_inspections: "Management",
  utilities_winterized: "Management",
  security_features: "Security",
  has_pool: "Features",
  pool_fenced: "Features",
  prior_damage: "Loss History",
  damage_type: "Loss History",
  prior_claims: "Loss History",
  claim_1_cause: "Loss History",
  claim_2_cause: "Loss History",
  claim_3_cause: "Loss History",
  claims_repaired: "Loss History",
  claims_largest_amount: "Loss History",
  prior_insurance: "Loss History",
  contact_phone: "Contact",
  contact_email: "Contact",
};

export function sectionForQuestion(q: Question): string {
  return q.summarySection ?? VACANT_SECTION_MAP[q.id] ?? "Details";
}

// Ordered, de-duplicated list of sections across a product's full question set.
export function orderedSections(questions: Question[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of questions) {
    const s = sectionForQuestion(q);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}