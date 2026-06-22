import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  ITEMS_BASE_RATE,
  ITEM_CATEGORY_FACTORS,
  ITEMS_PROVINCE_FACTORS,
  STORAGE_SECURITY_FACTORS,
  APPRAISAL_FACTORS,
  CARRIED_OUTSIDE_FACTOR,
  ITEMS_CLAIMS_FACTORS,
  ITEMS_DEDUCTIBLE_FACTORS,
  ITEMS_FLAT_ADJUSTMENTS,
  ITEM_COUNT_FACTORS,
  WORN_FREQUENCY_FACTORS,
  ALARM_MONITORED_FACTORS,
  INTERNATIONAL_TRAVEL_FACTORS,
  PRIOR_THEFT_FACTOR,
  DOCUMENTATION_FACTORS,
} from "@/data/personalItemsRatingFactors";
import { ITEMS_QUESTIONS } from "@/data/personalItemsQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// PERSONAL ITEMS (VALUABLE ARTICLES) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (totalInsuredValue × base_rate)  ← sum insured driven
//     × item_category_factor
//     × province_factor
//     × storage_security_factor
//     × appraisal_factor
//     × carried_outside_factor   (only if items carried off-premises)
//     × prior_losses_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculatePersonalItemsQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, ITEMS_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Sum insured → base premium
  const totalInsuredValue = Number(answers.total_insured_value?.value ?? 50_000);
  const basePremium = Math.round(totalInsuredValue * ITEMS_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Item category
  const category = String(answers.item_category?.value ?? "other");
  applyFactor(
    "Item Category",
    ITEM_CATEGORY_FACTORS[category] ?? 1.0,
    answers.item_category?.displayValue ?? category
  );

  // 2. Province / location
  const province = String(answers.home_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    ITEMS_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Storage security
  const storage = String(answers.storage_security?.value ?? "home_safe_alarm");
  applyFactor(
    "Storage Security",
    STORAGE_SECURITY_FACTORS[storage] ?? 1.0,
    answers.storage_security?.displayValue ?? storage
  );

  // 4. Professional appraisal
  const appraisal = String(answers.recent_appraisal?.value ?? "yes");
  applyFactor(
    "Professional Appraisal",
    APPRAISAL_FACTORS[appraisal] ?? 1.0,
    answers.recent_appraisal?.displayValue ?? appraisal
  );

  // 5. Carried outside the home (only when carried off-premises)
  if (answers.carried_outside_home?.value === "yes") {
    applyFactor(
      "Carried Outside Home",
      CARRIED_OUTSIDE_FACTOR,
      answers.carried_outside_home?.displayValue ?? "Carried/worn off-premises"
    );
  }

  // 6. Prior losses
  const losses = answers.prior_losses?.value;
  if (losses !== undefined) {
    applyFactor(
      "Loss History",
      ITEMS_CLAIMS_FACTORS[losses as string | number] ?? 1.0,
      answers.prior_losses?.displayValue ?? String(losses)
    );
  }

  // 7. Deductible
  const deductible = Number(answers.deductible?.value ?? 500);
  applyFactor(
    "Deductible",
    ITEMS_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 8. Number of scheduled items
  const itemCount = String(answers.number_of_items?.value ?? "4_10");
  applyFactor(
    "Number of Items",
    ITEM_COUNT_FACTORS[itemCount] ?? 1.0,
    answers.number_of_items?.displayValue ?? itemCount
  );

  // 9. Worn / used frequency
  const worn = String(answers.worn_frequency?.value ?? "occasional");
  applyFactor(
    "Worn / Used Frequency",
    WORN_FREQUENCY_FACTORS[worn] ?? 1.0,
    answers.worn_frequency?.displayValue ?? worn
  );

  // 10. Monitored alarm
  const alarm = String(answers.alarm_monitored?.value ?? "self_monitored");
  applyFactor(
    "Monitored Alarm",
    ALARM_MONITORED_FACTORS[alarm] ?? 1.0,
    answers.alarm_monitored?.displayValue ?? alarm
  );

  // 11. International travel
  const travel = String(answers.travel_international?.value ?? "never");
  applyFactor(
    "International Travel",
    INTERNATIONAL_TRAVEL_FACTORS[travel] ?? 1.0,
    answers.travel_international?.displayValue ?? travel
  );

  // 12. Prior theft of valuables
  if (answers.prior_theft_valuables?.value === "yes") {
    applyFactor(
      "Prior Theft of Valuables",
      PRIOR_THEFT_FACTOR,
      answers.prior_theft_valuables?.displayValue ?? "Prior theft reported"
    );
  }

  // 13. Documentation on file
  const documentation = String(answers.documentation_on_file?.value ?? "no");
  applyFactor(
    "Documentation on File",
    DOCUMENTATION_FACTORS[documentation] ?? 1.0,
    answers.documentation_on_file?.displayValue ?? documentation
  );

  // 14. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (Number(answers.single_item_max?.value ?? 0) > 50_000) {
    applyFlat(
      "High-Value Single Item",
      ITEMS_FLAT_ADJUSTMENTS.high_single_item,
      "A single item valued over $50k"
    );
  }
  if (answers.carried_outside_home?.value === "yes") {
    applyFlat(
      "Off-Premises Loading",
      ITEMS_FLAT_ADJUSTMENTS.carried_outside,
      "Items regularly carried off-premises"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(totalInsuredValue),
    deductible,
    factors,
  };
}
