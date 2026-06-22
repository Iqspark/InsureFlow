import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  JEWELLER_BASE_RATE,
  BUSINESS_TYPE_FACTORS,
  JEWELLER_PROVINCE_FACTORS,
  getYearsInBusinessFactor,
  STOCK_IN_SAFE_FACTORS,
  SAFE_RATING_FACTORS,
  ALARM_FACTORS,
  WINDOW_DISPLAY_FACTORS,
  OFFSITE_VALUE_FACTORS,
  JEWELLER_CLAIMS_FACTORS,
  JEWELLER_DEDUCTIBLE_FACTORS,
  PRODUCT_FOCUS_FACTORS,
  CONSIGNMENT_FACTORS,
  ENTRY_CONTROL_FACTORS,
  CCTV_FACTORS,
  REPAIRS_FACTORS,
  getEmployeeCountFactor,
  JEWELLER_FLAT_ADJUSTMENTS,
} from "@/data/jewellerRatingFactors";
import { JEWELLER_QUESTIONS } from "@/data/jewellerQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// JEWELLER'S BLOCK QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (maxStockValue × base_rate)   ← sum insured driven
//     × business_type_factor
//     × province_factor
//     × years_in_business_factor
//     × stock_in_safe_factor
//     × safe_rating_factor
//     × alarm_factor
//     × window_display_factor
//     × offsite_value_factor   (only if stock travels off-site)
//     × prior_losses_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculateJewellerQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, JEWELLER_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Sum insured → base premium
  const maxStockValue = Number(answers.max_stock_value?.value ?? 250_000);
  const basePremium = Math.round(maxStockValue * JEWELLER_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Business type
  const bizType = String(answers.business_type?.value ?? "retail");
  applyFactor(
    "Business Type",
    BUSINESS_TYPE_FACTORS[bizType] ?? 1.0,
    answers.business_type?.displayValue ?? bizType
  );

  // 2. Province / location
  const province = String(answers.business_province?.value ?? "");
  applyFactor(
    "Location (Province)",
    JEWELLER_PROVINCE_FACTORS[province] ?? 1.0,
    `Province: ${province || "N/A"}`
  );

  // 3. Years in business
  const years = Number(answers.years_in_business?.value ?? 5);
  applyFactor(
    "Trading Experience",
    getYearsInBusinessFactor(years),
    `${years} year${years === 1 ? "" : "s"} trading`
  );

  // 4. % of stock in safe overnight
  const inSafe = String(answers.stock_in_safe?.value ?? "most");
  applyFactor(
    "Stock Secured Overnight",
    STOCK_IN_SAFE_FACTORS[inSafe] ?? 1.0,
    answers.stock_in_safe?.displayValue ?? inSafe
  );

  // 5. Safe / vault grade
  const safe = String(answers.safe_rating?.value ?? "rated_safe");
  applyFactor(
    "Safe / Vault Grade",
    SAFE_RATING_FACTORS[safe] ?? 1.0,
    answers.safe_rating?.displayValue ?? safe
  );

  // 6. Burglar alarm
  const alarm = String(answers.alarm_type?.value ?? "central_premises");
  applyFactor(
    "Burglar Alarm",
    ALARM_FACTORS[alarm] ?? 1.0,
    answers.alarm_type?.displayValue ?? alarm
  );

  // 7. Window display exposure
  const window = String(answers.window_display_value?.value ?? "emptied");
  applyFactor(
    "Window Exposure",
    WINDOW_DISPLAY_FACTORS[window] ?? 1.0,
    answers.window_display_value?.displayValue ?? window
  );

  // 8. Off-premises / transit (only when carried off-site)
  if (answers.carries_stock_offsite?.value === "yes") {
    const offsite = String(answers.offsite_value?.value ?? "under_25k");
    applyFactor(
      "Off-Premises Exposure",
      OFFSITE_VALUE_FACTORS[offsite] ?? 1.0,
      answers.offsite_value?.displayValue ?? offsite
    );
  }

  // 9. Prior losses
  const losses = answers.prior_losses?.value;
  if (losses !== undefined) {
    applyFactor(
      "Loss History",
      JEWELLER_CLAIMS_FACTORS[losses as string | number] ?? 1.0,
      answers.prior_losses?.displayValue ?? String(losses)
    );
  }

  // 10. Deductible
  const deductible = Number(answers.deductible?.value ?? 5000);
  applyFactor(
    "Deductible",
    JEWELLER_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 11. Principal stock / product focus
  const focus = String(answers.product_focus?.value ?? "mixed");
  applyFactor(
    "Principal Stock",
    PRODUCT_FOCUS_FACTORS[focus] ?? 1.0,
    answers.product_focus?.displayValue ?? focus
  );

  // 12. Consignment / memo stock
  const consignment = String(answers.consignment_pct?.value ?? "low");
  applyFactor(
    "Consignment / Memo Stock",
    CONSIGNMENT_FACTORS[consignment] ?? 1.0,
    answers.consignment_pct?.displayValue ?? consignment
  );

  // 13. On-site entry control
  const entry = String(answers.entry_control?.value ?? "buzzer");
  applyFactor(
    "Entry Control",
    ENTRY_CONTROL_FACTORS[entry] ?? 1.0,
    answers.entry_control?.displayValue ?? entry
  );

  // 14. CCTV coverage
  const cctv = String(answers.cctv_coverage?.value ?? "partial");
  applyFactor(
    "CCTV Coverage",
    CCTV_FACTORS[cctv] ?? 1.0,
    answers.cctv_coverage?.displayValue ?? cctv
  );

  // 15. Employee count
  const employees = Number(answers.employee_count?.value ?? 3);
  applyFactor(
    "Staff Headcount",
    getEmployeeCountFactor(employees),
    `${employees} employee${employees === 1 ? "" : "s"}`
  );

  // 16. On-premises repairs / workshop
  const repairs = String(answers.repairs_on_premises?.value ?? "no");
  applyFactor(
    "On-Premises Repairs",
    REPAIRS_FACTORS[repairs] ?? 1.0,
    answers.repairs_on_premises?.displayValue ?? repairs
  );

  // 17. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.window_display_value?.value === "over_50k") {
    applyFlat(
      "High Window Value",
      JEWELLER_FLAT_ADJUSTMENTS.high_window_value,
      "Over $50k left in windows after hours"
    );
  }
  if (answers.carries_stock_offsite?.value === "yes") {
    applyFlat(
      "Transit Loading",
      JEWELLER_FLAT_ADJUSTMENTS.carries_offsite,
      "Stock regularly carried off-premises"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(maxStockValue),
    deductible,
    factors,
  };
}
