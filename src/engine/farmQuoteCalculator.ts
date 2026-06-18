import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  FARM_BASE_RATE,
  FARM_TYPE_FACTORS,
  FARM_PROVINCE_FACTORS,
  getYearsFarmingFactor,
  getRevenueFactor,
  getDwellingAgeFactor,
  CONSTRUCTION_FACTORS,
  ROOF_AGE_FACTORS,
  WIRING_FACTORS,
  PLUMBING_FACTORS,
  PRIMARY_HEATING_FACTORS,
  WOOD_HEAT_FACTORS,
  SMOKE_DETECTOR_FACTORS,
  MONITORED_SECURITY_FACTORS,
  POOL_FACTORS,
  getNumBuildingsFactor,
  LIABILITY_LIMIT_FACTORS,
  FARM_CLAIMS_FACTORS,
  FARM_DEDUCTIBLE_FACTORS,
  FARM_FLAT_ADJUSTMENTS,
} from "@/data/farmRatingFactors";
import { FARM_QUESTIONS } from "@/data/farmQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// FARM INSURANCE QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (sumInsured × base_rate)   ← sum insured driven
//     × farm_type × province × years_farming × revenue
//     × dwelling_age × construction × roof_age × wiring × plumbing
//     × primary_heating × wood_heat
//     × smoke_detectors × monitored_security × swimming_pool
//     × num_buildings × liability_limit × prior_losses × deductible
//     + flat_loadings
// ============================================================

export function calculateFarmQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, FARM_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Sum insured → base premium
  const sumInsured = Number(answers.sum_insured?.value ?? 1_000_000);
  const basePremium = Math.round(sumInsured * FARM_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Operation type
  const farmType = String(answers.farm_type?.value ?? "mixed");
  applyFactor(
    "Operation Type",
    FARM_TYPE_FACTORS[farmType] ?? 1.0,
    answers.farm_type?.displayValue ?? farmType
  );

  // 2. Province / location
  const province = String(answers.farm_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    FARM_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Years farming
  const years = Number(answers.years_farming?.value ?? 5);
  applyFactor(
    "Operating Experience",
    getYearsFarmingFactor(years),
    `${years} year${years === 1 ? "" : "s"} operating`
  );

  // 4. Gross revenue
  const revenue = Number(answers.gross_revenue?.value ?? 0);
  applyFactor(
    "Gross Revenue",
    getRevenueFactor(revenue),
    `$${revenue.toLocaleString()} gross receipts`
  );

  // 5. Dwelling age
  const yearBuilt = Number(answers.dwelling_year_built?.value ?? 1990);
  applyFactor(
    "Dwelling Age",
    getDwellingAgeFactor(yearBuilt),
    `Built ${yearBuilt}`
  );

  // 6. Construction
  const construction = String(answers.dwelling_construction?.value ?? "frame");
  applyFactor(
    "Construction",
    CONSTRUCTION_FACTORS[construction] ?? 1.0,
    answers.dwelling_construction?.displayValue ?? construction
  );

  // 7. Roof age
  const roofAge = String(answers.roof_age?.value ?? "mid");
  applyFactor(
    "Roof Age",
    ROOF_AGE_FACTORS[roofAge] ?? 1.0,
    answers.roof_age?.displayValue ?? roofAge
  );

  // 8. Electrical wiring
  const wiring = String(answers.electrical_wiring?.value ?? "copper");
  applyFactor(
    "Electrical Wiring",
    WIRING_FACTORS[wiring] ?? 1.0,
    answers.electrical_wiring?.displayValue ?? wiring
  );

  // 9. Plumbing
  const plumbing = String(answers.plumbing_type?.value ?? "copper_plastic");
  applyFactor(
    "Plumbing",
    PLUMBING_FACTORS[plumbing] ?? 1.0,
    answers.plumbing_type?.displayValue ?? plumbing
  );

  // 10. Primary heating
  const primaryHeating = String(answers.primary_heating?.value ?? "electric");
  applyFactor(
    "Primary Heating",
    PRIMARY_HEATING_FACTORS[primaryHeating] ?? 1.0,
    answers.primary_heating?.displayValue ?? primaryHeating
  );

  // 11. Wood / solid-fuel heat
  const woodHeat = String(answers.wood_heat?.value ?? "none");
  applyFactor(
    "Solid-Fuel Heat",
    WOOD_HEAT_FACTORS[woodHeat] ?? 1.0,
    answers.wood_heat?.displayValue ?? woodHeat
  );

  // 12. Smoke detectors
  const smoke = String(answers.smoke_detectors?.value ?? "yes");
  applyFactor(
    "Smoke Detectors",
    SMOKE_DETECTOR_FACTORS[smoke] ?? 1.0,
    smoke === "yes" ? "Present" : "None"
  );

  // 13. Monitored security
  const security = String(answers.monitored_security?.value ?? "no");
  applyFactor(
    "Monitored Security",
    MONITORED_SECURITY_FACTORS[security] ?? 1.0,
    security === "yes" ? "Monitored" : "None"
  );

  // 14. Swimming pool
  const pool = String(answers.swimming_pool?.value ?? "none");
  applyFactor(
    "Swimming Pool",
    POOL_FACTORS[pool] ?? 1.0,
    answers.swimming_pool?.displayValue ?? pool
  );

  // 15. Number of buildings
  const buildings = Number(answers.num_buildings?.value ?? 3);
  applyFactor(
    "Building Schedule",
    getNumBuildingsFactor(buildings),
    `${buildings} building${buildings === 1 ? "" : "s"}`
  );

  // 16. Liability limit
  const liabilityLimit = Number(answers.liability_limit?.value ?? 2_000_000);
  applyFactor(
    "Liability Limit",
    LIABILITY_LIMIT_FACTORS[liabilityLimit] ?? 1.0,
    `$${liabilityLimit.toLocaleString()} limit`
  );

  // 17. Prior losses
  const losses = answers.prior_losses?.value;
  if (losses !== undefined) {
    applyFactor(
      "Loss History",
      FARM_CLAIMS_FACTORS[losses as string | number] ?? 1.0,
      answers.prior_losses?.displayValue ?? String(losses)
    );
  }

  // 18. Deductible
  const deductible = Number(answers.deductible?.value ?? 2500);
  applyFactor(
    "Deductible",
    FARM_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 19. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.wood_heat?.value === "certified") {
    applyFlat(
      "Solid-Fuel Heat Loading",
      FARM_FLAT_ADJUSTMENTS.certified_wood_heat,
      "Certified woodstove / furnace on premises"
    );
  }
  if (answers.agritourism?.value === "yes") {
    applyFlat(
      "Agritourism Loading",
      FARM_FLAT_ADJUSTMENTS.agritourism,
      "Public-access / agritourism operations"
    );
  }
  if (answers.boards_livestock?.value === "yes") {
    applyFlat(
      "Livestock Bailee Loading",
      FARM_FLAT_ADJUSTMENTS.boards_livestock,
      "Boards livestock owned by others"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(sumInsured),
    deductible,
    factors,
  };
}
