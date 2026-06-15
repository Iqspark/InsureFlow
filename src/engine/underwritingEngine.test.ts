import { describe, it, expect } from "vitest";
import { runUnderwritingEngine } from "./underwritingEngine";
import { QUESTIONS } from "@/data/questions";
import { JEWELLER_QUESTIONS } from "@/data/jewellerQuestions";
import { Answer } from "@/types";

const a = (value: string | number | boolean, displayValue?: string): Answer => ({
  questionId: "x",
  value,
  displayValue: displayValue ?? String(value),
});

describe("runUnderwritingEngine — vacant home", () => {
  it("accepts when no rules are triggered", () => {
    const result = runUnderwritingEngine({}, QUESTIONS);
    expect(result.decision).toBe("accept");
    expect(result.declineReasons).toHaveLength(0);
    expect(result.referralReasons).toHaveLength(0);
  });

  it("declines an out-of-appetite property type", () => {
    const result = runUnderwritingEngine({ property_type: a("mobile") }, QUESTIONS);
    expect(result.decision).toBe("decline");
    expect(result.declineReasons.length).toBeGreaterThan(0);
  });

  it("refers a pre-1900 build", () => {
    const result = runUnderwritingEngine({ year_built: a(1850) }, QUESTIONS);
    expect(result.decision).toBe("refer");
    expect(result.referralReasons.length).toBeGreaterThan(0);
  });

  it("gives DECLINE precedence over REFER", () => {
    const result = runUnderwritingEngine(
      { property_type: a("mobile"), year_built: a(1850) },
      QUESTIONS
    );
    expect(result.decision).toBe("decline");
    expect(result.referralReasons).toHaveLength(0);
  });

  it("refers a prior fire claim (claim follow-up rule)", () => {
    const result = runUnderwritingEngine(
      { prior_claims: a(1), claim_1_cause: a("fire") },
      QUESTIONS
    );
    expect(result.decision).toBe("refer");
  });

  it("refers when claim damage is unrepaired", () => {
    const result = runUnderwritingEngine({ claims_repaired: a("no") }, QUESTIONS);
    expect(result.decision).toBe("refer");
  });

  it("defaults to the vacant-home QUESTIONS when no set is passed", () => {
    expect(runUnderwritingEngine({}).decision).toBe("accept");
  });
});

describe("runUnderwritingEngine — jeweller's block", () => {
  it("declines when no stock is secured overnight", () => {
    const result = runUnderwritingEngine({ stock_in_safe: a("none") }, JEWELLER_QUESTIONS);
    expect(result.decision).toBe("decline");
  });

  it("declines with no burglar alarm", () => {
    const result = runUnderwritingEngine({ alarm_type: a("none") }, JEWELLER_QUESTIONS);
    expect(result.decision).toBe("decline");
  });

  it("refers a pawnbroker", () => {
    const result = runUnderwritingEngine({ business_type: a("pawnbroker") }, JEWELLER_QUESTIONS);
    expect(result.decision).toBe("refer");
  });

  it("refers stock value over the senior-approval threshold", () => {
    const result = runUnderwritingEngine({ max_stock_value: a(6_000_000) }, JEWELLER_QUESTIONS);
    expect(result.decision).toBe("refer");
  });
});
