import { describe, it, expect } from "vitest";
import { calculateQuote } from "./quoteCalculator";
import { Answer } from "@/types";

const a = (value: string | number | boolean, displayValue?: string): Answer => ({
  questionId: "x",
  value,
  displayValue: displayValue ?? String(value),
});

// A minimal clean, accepted application.
const baseAnswers = (): Record<string, Answer> => ({
  property_province: a("ON"),
  property_type: a("single_family"),
  year_built: a(2005),
  square_footage: a(1800),
  property_value: a(400_000),
  coverage_amount: a("100"),
  deductible: a(2500),
  vacancy_duration: a("0-6m"),
  property_inspections: a("monthly"),
  security_features: a("locks_only"),
  prior_claims: a(0),
  prior_insurance: a("yes"),
});

describe("calculateQuote — vacant home", () => {
  it("accepts a clean application with a positive premium", () => {
    const q = calculateQuote(baseAnswers());
    expect(q.decision).toBe("accept");
    expect(q.finalAnnualPremium).toBeGreaterThan(0);
    expect(q.finalMonthlyPremium).toBe(Math.round(q.finalAnnualPremium / 12));
    expect(q.basePremium).toBe(500);
  });

  it("computes coverage from replacement cost × coverage %", () => {
    const answers = { ...baseAnswers(), property_value: a(400_000), coverage_amount: a("80") };
    expect(calculateQuote(answers).coverageAmount).toBe(320_000);
  });

  it("charges less premium for a higher deductible", () => {
    const low = calculateQuote({ ...baseAnswers(), deductible: a(1000) });
    const high = calculateQuote({ ...baseAnswers(), deductible: a(10_000) });
    expect(high.finalAnnualPremium).toBeLessThan(low.finalAnnualPremium);
  });

  it("declines a mobile home", () => {
    const q = calculateQuote({ ...baseAnswers(), property_type: a("mobile") });
    expect(q.decision).toBe("decline");
    expect(q.declineReasons.length).toBeGreaterThan(0);
  });

  it("refers a prior fire claim", () => {
    const q = calculateQuote({
      ...baseAnswers(),
      prior_claims: a(1),
      claim_1_cause: a("fire"),
    });
    expect(q.decision).toBe("refer");
  });

  it("adds a flat loading for active utilities", () => {
    const without = calculateQuote(baseAnswers());
    const withActive = calculateQuote({ ...baseAnswers(), utilities_winterized: a("no") });
    // Active utilities also trigger a referral, but the premium still loads $75.
    expect(withActive.finalAnnualPremium).toBe(without.finalAnnualPremium + 75);
  });
});
