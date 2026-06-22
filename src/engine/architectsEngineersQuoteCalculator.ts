import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  AE_BASE_RATE,
  AE_DISCIPLINE_FACTORS,
  AE_PROVINCE_FACTORS,
  getYearsFactor,
  getFeeIncomeFactor,
  AE_WORK_MIX_FACTORS,
  AE_QA_FACTORS,
  AE_CLAIMS_FACTORS,
  AE_COVERAGE_LIMIT_FACTORS,
  AE_DEDUCTIBLE_FACTORS,
  getStaffFactor,
  AE_HIGH_RISK_FACTORS,
  AE_CONTRACT_FACTORS,
  AE_SUBCONTRACT_FACTORS,
  AE_LARGEST_PROJECT_FACTORS,
  AE_USA_WORK_FACTORS,
} from "@/data/architectsEngineersRatingFactors";
import { AE_QUESTIONS } from "@/data/architectsEngineersQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// ARCHITECTS & ENGINEERS (PI) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (annualFeeIncome × base_rate)   ← fee-income driven
//     × fee_income_band_factor
//     × discipline_factor
//     × province_factor
//     × years_practising_factor
//     × work_mix_factor
//     × qa_process_factor
//     × prior_claims_factor
//     × coverage_limit_factor
//     × deductible_factor
// ============================================================

export function calculateArchitectsEngineersQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, AE_QUESTIONS);
  const factors: FactorBreakdown[] = [];

  // Annual fee income → base premium
  const feeIncome = Number(answers.annual_fee_income?.value ?? 500_000);
  const basePremium = Math.round(feeIncome * AE_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Fee income band
  applyFactor(
    "Fee Income Band",
    getFeeIncomeFactor(feeIncome),
    `$${feeIncome.toLocaleString()} annual fee income`
  );

  // 2. Discipline
  const discipline = String(answers.discipline?.value ?? "architecture");
  applyFactor(
    "Discipline",
    AE_DISCIPLINE_FACTORS[discipline] ?? 1.0,
    answers.discipline?.displayValue ?? discipline
  );

  // 3. Province / location
  const province = String(answers.business_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    AE_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 4. Years practising
  const years = Number(answers.years_practising?.value ?? 10);
  applyFactor(
    "Practice Experience",
    getYearsFactor(years),
    `${years} year${years === 1 ? "" : "s"} practising`
  );

  // 5. Work mix (structural / forensic share)
  const workMix = String(answers.structural_forensic_pct?.value ?? "under_25");
  applyFactor(
    "Work Mix",
    AE_WORK_MIX_FACTORS[workMix] ?? 1.0,
    answers.structural_forensic_pct?.displayValue ?? workMix
  );

  // 6. QA / peer-review process
  const qa = String(answers.has_qa_process?.value ?? "yes");
  applyFactor(
    "Quality Assurance",
    AE_QA_FACTORS[qa] ?? 1.0,
    answers.has_qa_process?.displayValue ?? qa
  );

  // 7. Prior claims
  const claims = answers.prior_claims?.value;
  if (claims !== undefined) {
    applyFactor(
      "Claims History",
      AE_CLAIMS_FACTORS[claims as string | number] ?? 1.0,
      answers.prior_claims?.displayValue ?? String(claims)
    );
  }

  // 8. Coverage limit
  const coverageAmount = Number(answers.coverage_limit?.value ?? 1_000_000);
  applyFactor(
    "PI Limit",
    AE_COVERAGE_LIMIT_FACTORS[coverageAmount] ?? 1.0,
    `$${coverageAmount.toLocaleString()} limit`
  );

  // 9. Deductible
  const deductible = Number(answers.deductible?.value ?? 10000);
  applyFactor(
    "Deductible",
    AE_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 10. Professional / technical staff count
  const staff = Number(answers.staff_count?.value ?? 8);
  applyFactor(
    "Firm Size",
    getStaffFactor(staff),
    `${staff} professional / technical staff`
  );

  // 11. High-risk project share (condos / bridges / foundations)
  const highRisk = String(answers.high_risk_project_pct?.value ?? "under_25");
  applyFactor(
    "High-Risk Project Share",
    AE_HIGH_RISK_FACTORS[highRisk] ?? 1.0,
    answers.high_risk_project_pct?.displayValue ?? highRisk
  );

  // 12. Written contracts / limitation of liability
  const contracts = String(answers.written_contracts_limitation?.value ?? "sometimes");
  applyFactor(
    "Contracts & Liability Cap",
    AE_CONTRACT_FACTORS[contracts] ?? 1.0,
    answers.written_contracts_limitation?.displayValue ?? contracts
  );

  // 13. Work subcontracted out
  const subcontracted = String(answers.pct_subcontracted?.value ?? "none");
  applyFactor(
    "Subcontracted Work",
    AE_SUBCONTRACT_FACTORS[subcontracted] ?? 1.0,
    answers.pct_subcontracted?.displayValue ?? subcontracted
  );

  // 14. Largest project value
  const largestProject = String(answers.largest_project_value?.value ?? "m1_10");
  applyFactor(
    "Largest Project",
    AE_LARGEST_PROJECT_FACTORS[largestProject] ?? 1.0,
    answers.largest_project_value?.displayValue ?? largestProject
  );

  // 15. US project exposure
  const usaWork = String(answers.usa_work?.value ?? "none");
  applyFactor(
    "US Project Exposure",
    AE_USA_WORK_FACTORS[usaWork] ?? 1.0,
    answers.usa_work?.displayValue ?? usaWork
  );

  const finalAnnualPremium = Math.round(premium);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(coverageAmount),
    deductible,
    factors,
  };
}
