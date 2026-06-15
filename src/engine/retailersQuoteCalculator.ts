import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  RETAIL_BASE_RATE,
  STORE_TYPE_FACTORS,
  RETAIL_PROVINCE_FACTORS,
  CONSTRUCTION_FACTORS,
  FIRE_PROTECTION_FACTORS,
  BURGLAR_ALARM_FACTORS,
  RETAIL_CLAIMS_FACTORS,
  RETAIL_DEDUCTIBLE_FACTORS,
  getTurnoverLiabilityLoading,
} from "@/data/retailersRatingFactors";
import { RETAIL_QUESTIONS } from "@/data/retailersQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// RETAILERS (COMMERCIAL PACKAGE) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (stockContentsValue × base_rate)  ← sum insured driven
//     × store_type_factor
//     × province_factor
//     × construction_factor
//     × fire_protection_factor
//     × burglar_alarm_factor
//     × prior_claims_factor
//     × deductible_factor
//     + general_liability_loading   (flat, by turnover band)
// ============================================================

export function calculateRetailersQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, RETAIL_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Sum insured → base premium
  const stockContentsValue = Number(
    answers.stock_contents_value?.value ?? 250_000
  );
  const basePremium = Math.round(stockContentsValue * RETAIL_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Store type
  const storeType = String(answers.store_type?.value ?? "other");
  applyFactor(
    "Store Type",
    STORE_TYPE_FACTORS[storeType] ?? 1.0,
    answers.store_type?.displayValue ?? storeType
  );

  // 2. Province / location
  const province = String(answers.business_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    RETAIL_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Building construction
  const construction = String(answers.building_construction?.value ?? "mixed");
  applyFactor(
    "Construction",
    CONSTRUCTION_FACTORS[construction] ?? 1.0,
    answers.building_construction?.displayValue ?? construction
  );

  // 4. Fire protection
  const fire = String(answers.fire_protection?.value ?? "monitored_alarm");
  applyFactor(
    "Fire Protection",
    FIRE_PROTECTION_FACTORS[fire] ?? 1.0,
    answers.fire_protection?.displayValue ?? fire
  );

  // 5. Burglar alarm
  const alarm = String(answers.burglar_alarm?.value ?? "central");
  applyFactor(
    "Burglar Alarm",
    BURGLAR_ALARM_FACTORS[alarm] ?? 1.0,
    answers.burglar_alarm?.displayValue ?? alarm
  );

  // 6. Prior claims
  const claims = answers.prior_claims?.value;
  if (claims !== undefined) {
    applyFactor(
      "Loss History",
      RETAIL_CLAIMS_FACTORS[claims as string | number] ?? 1.0,
      answers.prior_claims?.displayValue ?? String(claims)
    );
  }

  // 7. Deductible
  const deductible = Number(answers.deductible?.value ?? 2500);
  applyFactor(
    "Deductible",
    RETAIL_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 8. General liability loading (flat, by turnover band)
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  const turnover = Number(answers.annual_turnover?.value ?? 0);
  applyFlat(
    "General Liability",
    getTurnoverLiabilityLoading(turnover),
    `Liability cover for $${turnover.toLocaleString()} turnover`
  );

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(stockContentsValue),
    deductible,
    factors,
  };
}
