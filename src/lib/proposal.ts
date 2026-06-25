import { createHash } from "crypto";

// The declaration the applicant accepts when they e-sign the proposal. Versioned
// so a stored signature records exactly which wording was agreed to.
export const DECLARATION_VERSION = "1.0";

export const DECLARATION_TEXT =
  "I confirm that the information provided in this application is true, accurate, " +
  "and complete to the best of my knowledge. I understand that this application " +
  "forms the basis of the insurance contract and that any material " +
  "misrepresentation or omission may void coverage. I have reviewed the coverage, " +
  "premium, and terms shown above and I accept them.";

// The contract terms a signature is bound to. Any change to these (e.g. the broker
// edits the premium or coverage after the client signed) changes the hash and
// therefore voids the prior signature — bind must re-verify the hash matches.
export type ProposalFacts = {
  policyType: string;
  applicantName: string | null;
  province: string | null;
  decision: string | null;
  annualPremium: number | null;
  monthlyPremium: number | null;
  coverageAmount: number | null;
  deductible: number | null;
};

// Stable, canonical SHA-256 of the proposal terms + declaration version.
export function proposalDocumentHash(f: ProposalFacts): string {
  const canonical = JSON.stringify({
    v: DECLARATION_VERSION,
    policyType: f.policyType,
    applicantName: f.applicantName ?? null,
    province: f.province ?? null,
    decision: f.decision ?? null,
    annualPremium: f.annualPremium ?? null,
    monthlyPremium: f.monthlyPremium ?? null,
    coverageAmount: f.coverageAmount ?? null,
    deductible: f.deductible ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
