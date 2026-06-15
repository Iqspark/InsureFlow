import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  CONTRACTOR_BASE_RATE,
  TRADE_TYPE_FACTORS,
  CONTRACTOR_PROVINCE_FACTORS,
  getYearsInBusinessFactor,
  getRevenueFactor,
  SUBCONTRACTOR_FACTORS,
  HEIGHT_DETAIL_FACTORS,
  CONTRACTOR_CLAIMS_FACTORS,
  CONTRACTOR_DEDUCTIBLE_FACTORS,
  COVERAGE_LIMIT_FACTORS,
  CONTRACTOR_FLAT_ADJUSTMENTS,
} from "@/data/contractorRatingFactors";
import { CONTRACTOR_QUESTIONS } from "@/data/contractorQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// CONTRACTOR (GENERAL LIABILITY) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (annualRevenue × base_rate)   ← turnover driven
//     × trade_type_factor
//     × province_factor
//     × years_in_business_factor
//     × revenue_band_factor
//     × subcontractor_factor
//     × height_detail_factor   (only if works at height)
//     × prior_claims_factor
//     × coverage_limit_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculateContractorQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, CONTRACTOR_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Annual revenue → base premium (turnover-rated)
  const annualRevenue = Number(answers.annual_revenue?.value ?? 500_000);
  const basePremium = Math.round(annualRevenue * CONTRACTOR_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Trade hazard
  const trade = String(answers.trade_type?.value ?? "carpentry");
  applyFactor(
    "Trade Hazard",
    TRADE_TYPE_FACTORS[trade] ?? 1.0,
    answers.trade_type?.displayValue ?? trade
  );

  // 2. Province / location
  const province = String(answers.business_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    CONTRACTOR_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Years in business
  const years = Number(answers.years_in_business?.value ?? 5);
  applyFactor(
    "Operating Experience",
    getYearsInBusinessFactor(years),
    `${years} year${years === 1 ? "" : "s"} operating`
  );

  // 4. Revenue band
  applyFactor(
    "Revenue Band",
    getRevenueFactor(annualRevenue),
    `$${annualRevenue.toLocaleString()} annual revenue`
  );

  // 5. Subcontractor use
  const subs = String(answers.subcontractor_use?.value ?? "none");
  applyFactor(
    "Subcontractor Use",
    SUBCONTRACTOR_FACTORS[subs] ?? 1.0,
    answers.subcontractor_use?.displayValue ?? subs
  );

  // 6. Work at height (only when the contractor works at height)
  if (answers.works_at_height?.value === "yes") {
    const height = String(answers.height_detail?.value ?? "up_to_3");
    applyFactor(
      "Work at Height",
      HEIGHT_DETAIL_FACTORS[height] ?? 1.0,
      answers.height_detail?.displayValue ?? height
    );
  }

  // 7. Prior claims
  const claims = answers.prior_claims?.value;
  if (claims !== undefined) {
    applyFactor(
      "Claims History",
      CONTRACTOR_CLAIMS_FACTORS[claims as string | number] ?? 1.0,
      answers.prior_claims?.displayValue ?? String(claims)
    );
  }

  // 8. Coverage limit
  const coverageAmount = Number(answers.coverage_limit?.value ?? 2_000_000);
  applyFactor(
    "GL Aggregate Limit",
    COVERAGE_LIMIT_FACTORS[coverageAmount] ?? 1.0,
    answers.coverage_limit?.displayValue ?? `$${coverageAmount.toLocaleString()}`
  );

  // 9. Deductible
  const deductible = Number(answers.deductible?.value ?? 2500);
  applyFactor(
    "Deductible",
    CONTRACTOR_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 10. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.works_at_height?.value === "yes") {
    applyFlat(
      "Height Loading",
      CONTRACTOR_FLAT_ADJUSTMENTS.works_at_height,
      "Work regularly performed at height"
    );
  }
  if (answers.subcontractor_use?.value === "frequent") {
    applyFlat(
      "Subcontractor Loading",
      CONTRACTOR_FLAT_ADJUSTMENTS.frequent_subs,
      "Frequent subcontracting — COI administration"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
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
