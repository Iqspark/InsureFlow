import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  RENTAL_BASE_RATE,
  RENTAL_PROVINCE_FACTORS,
  PROPERTY_TYPE_FACTORS,
  getYearBuiltFactor,
  TENANT_TYPE_FACTORS,
  OCCUPANCY_STATUS_FACTORS,
  RENTAL_CLAIMS_FACTORS,
  SMOKE_ALARM_FACTORS,
  RENTAL_DEDUCTIBLE_FACTORS,
  RENTAL_FLAT_ADJUSTMENTS,
} from "@/data/rentalHomeRatingFactors";
import { RENTAL_QUESTIONS } from "@/data/rentalHomeQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// RENTAL HOMES (LANDLORD) QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (rebuildValue × base_rate)   ← sum insured driven
//     × province_factor
//     × property_type_factor
//     × year_built_factor
//     × tenant_type_factor
//     × occupancy_status_factor
//     × prior_claims_factor
//     × smoke_alarm_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculateRentalHomeQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, RENTAL_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Sum insured → base premium
  const rebuildValue = Number(answers.rebuild_value?.value ?? 450_000);
  const basePremium = Math.round(rebuildValue * RENTAL_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Province / location
  const province = String(answers.rental_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    RENTAL_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 2. Property type
  const propertyType = String(answers.property_type?.value ?? "detached");
  applyFactor(
    "Property Type",
    PROPERTY_TYPE_FACTORS[propertyType] ?? 1.0,
    answers.property_type?.displayValue ?? propertyType
  );

  // 3. Year built → age band
  const yearBuilt = Number(answers.year_built?.value ?? 1990);
  applyFactor(
    "Property Age",
    getYearBuiltFactor(yearBuilt),
    `Built ${yearBuilt}`
  );

  // 4. Tenant type
  const tenantType = String(answers.tenant_type?.value ?? "professionals");
  applyFactor(
    "Tenant Profile",
    TENANT_TYPE_FACTORS[tenantType] ?? 1.0,
    answers.tenant_type?.displayValue ?? tenantType
  );

  // 5. Occupancy status
  const occupancy = String(answers.occupancy_status?.value ?? "fully_occupied");
  applyFactor(
    "Occupancy",
    OCCUPANCY_STATUS_FACTORS[occupancy] ?? 1.0,
    answers.occupancy_status?.displayValue ?? occupancy
  );

  // 6. Prior claims
  const claims = answers.prior_claims?.value;
  if (claims !== undefined) {
    applyFactor(
      "Claims History",
      RENTAL_CLAIMS_FACTORS[claims as string | number] ?? 1.0,
      answers.prior_claims?.displayValue ?? String(claims)
    );
  }

  // 7. Working smoke / CO alarms
  const alarms = String(answers.smoke_alarms?.value ?? "yes");
  applyFactor(
    "Fire Protection",
    SMOKE_ALARM_FACTORS[alarms] ?? 1.0,
    answers.smoke_alarms?.displayValue ?? alarms
  );

  // 8. Deductible
  const deductible = Number(answers.deductible?.value ?? 2500);
  applyFactor(
    "Deductible",
    RENTAL_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 9. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.occupancy_status?.value === "partially_occupied") {
    applyFlat(
      "Partial Vacancy Loading",
      RENTAL_FLAT_ADJUSTMENTS.partial_vacancy,
      "Property is only partially occupied"
    );
  }
  if (answers.tenant_type?.value === "students") {
    applyFlat(
      "Student Let Loading",
      RENTAL_FLAT_ADJUSTMENTS.student_let,
      "Student tenancy turnover loading"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(rebuildValue),
    deductible,
    factors,
  };
}
