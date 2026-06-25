import { describe, it, expect } from "vitest";
import { proposalDocumentHash, type ProposalFacts } from "./proposal";

const base: ProposalFacts = {
  policyType: "Vacant Home Insurance",
  applicantName: "Jane Doe",
  province: "ON",
  decision: "accept",
  annualPremium: 1200,
  monthlyPremium: 110,
  coverageAmount: 500000,
  deductible: 2500,
};

describe("proposalDocumentHash", () => {
  it("is deterministic for the same facts", () => {
    expect(proposalDocumentHash(base)).toBe(proposalDocumentHash({ ...base }));
  });

  it("changes when a contract term changes (voids a prior signature)", () => {
    const h = proposalDocumentHash(base);
    expect(proposalDocumentHash({ ...base, annualPremium: 1 })).not.toBe(h);
    expect(proposalDocumentHash({ ...base, coverageAmount: 999999 })).not.toBe(h);
    expect(proposalDocumentHash({ ...base, decision: "refer" })).not.toBe(h);
  });

  it("produces a hex SHA-256 digest", () => {
    expect(proposalDocumentHash(base)).toMatch(/^[a-f0-9]{64}$/);
  });
});
