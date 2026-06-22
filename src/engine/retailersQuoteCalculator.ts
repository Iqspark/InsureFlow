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
  BUILDING_AGE_FACTORS,
  ONLINE_SALES_FACTORS,
  AGE_RESTRICTED_FACTORS,
  COOKING_FACTORS,
  CASH_ON_PREMISES_FACTORS,
  LIABILITY_LIMIT_FACTORS,
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

  // 8. Building age
  const buildingAge = String(answers.building_age?.value ?? "y15_40");
  applyFactor(
    "Building Age",
    BUILDING_AGE_FACTORS[buildingAge] ?? 1.0,
    answers.building_age?.displayValue ?? buildingAge
  );

  // 9. Online sales share
  const onlineSales = String(answers.online_sales_share?.value ?? "upto25");
  applyFactor(
    "Online Sales Share",
    ONLINE_SALES_FACTORS[onlineSales] ?? 1.0,
    answers.online_sales_share?.displayValue ?? onlineSales
  );

  // 10. Age-restricted goods
  const ageRestricted = String(answers.age_restricted_goods?.value ?? "none");
  applyFactor(
    "Age-Restricted Goods",
    AGE_RESTRICTED_FACTORS[ageRestricted] ?? 1.0,
    answers.age_restricted_goods?.displayValue ?? ageRestricted
  );

  // 11. On-site cooking
  const cooking = String(answers.food_cooking?.value ?? "none");
  applyFactor(
    "On-Site Cooking",
    COOKING_FACTORS[cooking] ?? 1.0,
    answers.food_cooking?.displayValue ?? cooking
  );

  // 12. After-hours cash on premises
  const cash = String(answers.after_hours_cash?.value ?? "under_1k");
  applyFactor(
    "After-Hours Cash",
    CASH_ON_PREMISES_FACTORS[cash] ?? 1.0,
    answers.after_hours_cash?.displayValue ?? cash
  );

  // 13. Public liability limit
  const liabilityLimit = String(answers.liability_limit?.value ?? "l1m");
  applyFactor(
    "Liability Limit",
    LIABILITY_LIMIT_FACTORS[liabilityLimit] ?? 1.0,
    answers.liability_limit?.displayValue ?? liabilityLimit
  );

  // 14. General liability loading (flat, by turnover band)
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
