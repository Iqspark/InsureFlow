import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  BASE_PREMIUM,
  PROVINCE_FACTORS,
  VACANCY_DURATION_FACTORS,
  PROPERTY_TYPE_FACTORS,
  INSPECTION_FREQUENCY_FACTORS,
  SECURITY_FACTORS,
  PRIOR_CLAIMS_FACTORS,
  DEDUCTIBLE_FACTORS,
  COVERAGE_PERCENT_FACTORS,
  FLAT_ADJUSTMENTS,
  getPropertyValueFactor,
  getYearBuiltFactor,
} from "@/data/ratingFactors";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// QUOTE CALCULATOR (CAD)
// ============================================================
// Formula:
//   Annual Premium = BASE_PREMIUM
//     × province_factor
//     × vacancy_duration_factor
//     × property_type_factor
//     × property_value_factor
//     × year_built_factor
//     × inspection_frequency_factor
//     × security_factor
//     × prior_claims_factor
//     × deductible_factor
//     × coverage_percent_factor
//     + flat_adjustments
// ============================================================

export function calculateQuote(answers: Record<string, Answer>): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers);
  const factors: FactorBreakdown[] = [];
  let premium = BASE_PREMIUM;
  let flatTotal = 0;

  // Helper to apply a multiplier and record it
  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Province / Territory
  const province = String(answers.property_province?.value ?? "");
  const stateFactor = PROVINCE_FACTORS[province] ?? 1.0;
  applyFactor("Location (Province)", stateFactor, `Province: ${province || "N/A"}`);

  // 2. Vacancy Duration
  const duration = String(answers.vacancy_duration?.value ?? "0-6m");
  const durationFactor = VACANCY_DURATION_FACTORS[duration] ?? 1.0;
  applyFactor(
    "Vacancy Duration",
    durationFactor,
    answers.vacancy_duration?.displayValue ?? duration
  );

  // 3. Property Type
  const propType = String(answers.property_type?.value ?? "single_family");
  const typeFactor = PROPERTY_TYPE_FACTORS[propType] ?? 1.0;
  applyFactor(
    "Property Type",
    typeFactor,
    answers.property_type?.displayValue ?? propType
  );

  // 4. Property Value (dynamic scaling)
  const propertyValue = Number(answers.property_value?.value ?? 250_000);
  const valueFactor = getPropertyValueFactor(propertyValue);
  applyFactor(
    "Replacement Cost",
    valueFactor,
    `$${propertyValue.toLocaleString()}`
  );

  // 5. Year Built (age factor)
  const yearBuilt = Number(answers.year_built?.value ?? 1985);
  const ageFactor = getYearBuiltFactor(yearBuilt);
  applyFactor(
    "Property Age",
    ageFactor,
    `Built ${yearBuilt} (${new Date().getFullYear() - yearBuilt} yrs old)`
  );

  // 6. Inspection Frequency
  const inspFreq = String(answers.property_inspections?.value ?? "monthly");
  if (inspFreq) {
    const inspFactor = INSPECTION_FREQUENCY_FACTORS[inspFreq] ?? 1.0;
    applyFactor(
      "Inspection Frequency",
      inspFactor,
      answers.property_inspections?.displayValue ?? inspFreq
    );
  }

  // 7. Security Features
  const security = String(answers.security_features?.value ?? "locks_only");
  if (security) {
    const secFactor = SECURITY_FACTORS[security] ?? 1.0;
    applyFactor(
      "Security Measures",
      secFactor,
      answers.security_features?.displayValue ?? security
    );
  }

  // 8. Prior Claims
  const priorClaims = answers.prior_claims?.value;
  if (priorClaims !== undefined) {
    const claimsFactor =
      PRIOR_CLAIMS_FACTORS[priorClaims as string | number] ?? 1.0;
    applyFactor(
      "Claims History",
      claimsFactor,
      answers.prior_claims?.displayValue ?? String(priorClaims)
    );
  }

  // 9. Deductible
  const deductible = Number(answers.deductible?.value ?? 2500);
  const dedFactor = DEDUCTIBLE_FACTORS[deductible] ?? 1.0;
  applyFactor(
    "Deductible",
    dedFactor,
    `$${deductible.toLocaleString()} deductible`
  );

  // 10. Coverage Percentage
  const coveragePct = String(answers.coverage_amount?.value ?? "100");
  const coverageFactor = COVERAGE_PERCENT_FACTORS[coveragePct] ?? 1.0;
  applyFactor(
    "Coverage Level",
    coverageFactor,
    `${coveragePct}% of replacement cost`
  );

  // 11. Flat Adjustments
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (
    answers.has_pool?.value === "yes" &&
    answers.pool_fenced?.value === "no"
  ) {
    applyFlat(
      "Pool Surcharge",
      FLAT_ADJUSTMENTS.unfenced_pool,
      "Unfenced swimming pool"
    );
  }
  if (answers.prior_damage?.value === "yes") {
    applyFlat(
      "Known Damage",
      FLAT_ADJUSTMENTS.has_damage,
      "Existing property damage reported"
    );
  }
  if (answers.prior_insurance?.value === "no") {
    applyFlat(
      "Coverage Lapse",
      FLAT_ADJUSTMENTS.no_prior_insurance,
      "No prior/current insurance"
    );
  }
  if (answers.utilities_winterized?.value === "no") {
    applyFlat(
      "Utility Risk",
      FLAT_ADJUSTMENTS.utilities_active,
      "Active utilities in vacant home"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);
  const coverageAmount = Math.round(
    propertyValue * (Number(coveragePct) / 100)
  );

  return {
    ...uwDecision,
    basePremium: BASE_PREMIUM,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount,
    deductible,
    factors,
  };
}
