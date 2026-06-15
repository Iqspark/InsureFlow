import { describe, it, expect } from "vitest";
import { calculateJewellerQuote } from "./jewellerQuoteCalculator";
import { Answer } from "@/types";

const a = (value: string | number | boolean, displayValue?: string): Answer => ({
  questionId: "x",
  value,
  displayValue: displayValue ?? String(value),
});

// A clean, well-secured retailer (no decline/refer triggers).
const baseAnswers = (): Record<string, Answer> => ({
  business_type: a("retail"),
  business_province: a("ON"),
  years_in_business: a(8),
  max_stock_value: a(500_000),
  stock_in_safe: a("all"),
  safe_rating: a("vault_high"),
  alarm_type: a("central_safe"),
  window_display_value: a("emptied"),
  carries_stock_offsite: a("no"),
  prior_losses: a(0),
  deductible: a(5000),
});

describe("calculateJewellerQuote", () => {
  it("accepts a well-secured retailer and sets the sum insured as coverage", () => {
    const q = calculateJewellerQuote(baseAnswers());
    expect(q.decision).toBe("accept");
    expect(q.coverageAmount).toBe(500_000);
    expect(q.finalAnnualPremium).toBeGreaterThan(0);
    expect(q.basePremium).toBe(5000); // 500k × 1% base rate
  });

  it("scales the premium with the sum insured", () => {
    const small = calculateJewellerQuote(baseAnswers());
    const large = calculateJewellerQuote({ ...baseAnswers(), max_stock_value: a(1_000_000) });
    // Premium is linear in the sum insured when no flat loadings apply.
    expect(Math.abs(large.finalAnnualPremium - 2 * small.finalAnnualPremium)).toBeLessThanOrEqual(2);
  });

  it("declines when stock is left out of the safe overnight", () => {
    const q = calculateJewellerQuote({ ...baseAnswers(), stock_in_safe: a("none") });
    expect(q.decision).toBe("decline");
  });

  it("refers a local-alarm-only premises", () => {
    const q = calculateJewellerQuote({ ...baseAnswers(), alarm_type: a("local_only") });
    expect(q.decision).toBe("refer");
  });

  it("charges less for a higher deductible", () => {
    const low = calculateJewellerQuote({ ...baseAnswers(), deductible: a(2500) });
    const high = calculateJewellerQuote({ ...baseAnswers(), deductible: a(25_000) });
    expect(high.finalAnnualPremium).toBeLessThan(low.finalAnnualPremium);
  });
});
