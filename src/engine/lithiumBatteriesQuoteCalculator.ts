import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  BATTERY_BASE_RATE,
  BUSINESS_ROLE_FACTORS,
  BATTERY_PROVINCE_FACTORS,
  BATTERY_CHEMISTRY_FACTORS,
  APPLICATION_FACTORS,
  getTurnoverBandFactor,
  CERTIFICATION_FACTORS,
  RECALL_HISTORY_FACTORS,
  BATTERY_CLAIMS_FACTORS,
  BATTERY_DEDUCTIBLE_FACTORS,
  BATTERY_FLAT_ADJUSTMENTS,
} from "@/data/lithiumBatteriesRatingFactors";
import { BATTERY_QUESTIONS } from "@/data/lithiumBatteriesQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// LITHIUM BATTERIES (PRODUCT LIABILITY) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (annualTurnover × base_rate)   ← turnover driven
//     × business_role_factor
//     × province_factor
//     × battery_chemistry_factor
//     × application_factor
//     × turnover_band_factor
//     × certification_factor
//     × recall_history_factor
//     × prior_claims_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculateLithiumBatteriesQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, BATTERY_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Annual turnover → base premium
  const annualTurnover = Number(answers.annual_turnover?.value ?? 1_000_000);
  const basePremium = Math.round(annualTurnover * BATTERY_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Supply-chain role
  const role = String(answers.business_role?.value ?? "reseller");
  applyFactor(
    "Supply-Chain Role",
    BUSINESS_ROLE_FACTORS[role] ?? 1.0,
    answers.business_role?.displayValue ?? role
  );

  // 2. Province / location
  const province = String(answers.business_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    BATTERY_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Battery chemistry
  const chemistry = String(answers.battery_chemistry?.value ?? "li_ion");
  applyFactor(
    "Battery Chemistry",
    BATTERY_CHEMISTRY_FACTORS[chemistry] ?? 1.0,
    answers.battery_chemistry?.displayValue ?? chemistry
  );

  // 4. End-use application
  const application = String(answers.application?.value ?? "consumer_electronics");
  applyFactor(
    "End-Use Application",
    APPLICATION_FACTORS[application] ?? 1.0,
    answers.application?.displayValue ?? application
  );

  // 5. Turnover band
  applyFactor(
    "Turnover Band",
    getTurnoverBandFactor(annualTurnover),
    `$${annualTurnover.toLocaleString()} turnover`
  );

  // 6. Safety certification
  const certification = String(answers.certification?.value ?? "ul_certified");
  applyFactor(
    "Safety Certification",
    CERTIFICATION_FACTORS[certification] ?? 1.0,
    answers.certification?.displayValue ?? certification
  );

  // 7. Recall history
  const recall = String(answers.recall_history?.value ?? "no");
  applyFactor(
    "Recall History",
    RECALL_HISTORY_FACTORS[recall] ?? 1.0,
    answers.recall_history?.displayValue ?? recall
  );

  // 8. Prior claims
  const claims = answers.prior_claims?.value;
  if (claims !== undefined) {
    applyFactor(
      "Claims History",
      BATTERY_CLAIMS_FACTORS[claims as string | number] ?? 1.0,
      answers.prior_claims?.displayValue ?? String(claims)
    );
  }

  // 9. Deductible
  const deductible = Number(answers.deductible?.value ?? 10000);
  applyFactor(
    "Deductible",
    BATTERY_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 10. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.recall_history?.value === "yes") {
    applyFlat(
      "Recall Loading",
      BATTERY_FLAT_ADJUSTMENTS.prior_recall,
      "Product recall within the last 5 years"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  const coverageAmount = Number(answers.coverage_limit?.value ?? 2_000_000);

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
