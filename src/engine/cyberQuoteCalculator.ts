import { Answer, QuoteDetails, FactorBreakdown } from "@/types";
import {
  CYBER_BASE_RATE,
  INDUSTRY_FACTORS,
  getRevenueFactor,
  RECORDS_HELD_FACTORS,
  MFA_FACTORS,
  BACKUP_FACTORS,
  ENDPOINT_FACTORS,
  CYBER_CLAIMS_FACTORS,
  CYBER_DEDUCTIBLE_FACTORS,
  TRAINING_FACTORS,
  PATCH_FACTORS,
  ENCRYPTION_FACTORS,
  REMOTE_ACCESS_FACTORS,
  VENDOR_DEPENDENCY_FACTORS,
  IR_PLAN_FACTORS,
  CYBER_FLAT_ADJUSTMENTS,
} from "@/data/cyberRatingFactors";
import { CYBER_QUESTIONS } from "@/data/cyberQuestions";
import { runUnderwritingEngine } from "./underwritingEngine";

// ============================================================
// CYBER LIABILITY QUOTE CALCULATOR (CAD)
// ============================================================
//   Annual Premium = (coverageLimit × base_rate)   ← aggregate limit driven
//     × industry_factor
//     × revenue_factor
//     × records_held_factor
//     × mfa_factor
//     × backup_factor
//     × endpoint_factor
//     × prior_incidents_factor
//     × deductible_factor
//     + flat_loadings
// ============================================================

export function calculateCyberQuote(
  answers: Record<string, Answer>
): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, CYBER_QUESTIONS);
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Aggregate limit → base premium
  const coverageLimit = Number(answers.coverage_limit?.value ?? 1_000_000);
  const basePremium = Math.round(coverageLimit * CYBER_BASE_RATE);
  let premium = basePremium;

  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // 1. Industry
  const industry = String(answers.industry?.value ?? "professional");
  applyFactor(
    "Industry",
    INDUSTRY_FACTORS[industry] ?? 1.0,
    answers.industry?.displayValue ?? industry
  );

  // 2. Annual revenue
  const revenue = Number(answers.annual_revenue?.value ?? 5_000_000);
  applyFactor(
    "Annual Revenue",
    getRevenueFactor(revenue),
    `$${revenue.toLocaleString()} revenue`
  );

  // 3. Sensitive records held
  const records = String(answers.records_held?.value ?? "k10_100");
  applyFactor(
    "Data Exposure",
    RECORDS_HELD_FACTORS[records] ?? 1.0,
    answers.records_held?.displayValue ?? records
  );

  // 4. Multi-factor authentication
  const mfa = String(answers.mfa_enabled?.value ?? "yes");
  applyFactor(
    "Multi-Factor Authentication",
    MFA_FACTORS[mfa] ?? 1.0,
    answers.mfa_enabled?.displayValue ?? mfa
  );

  // 5. Backups
  const backups = String(answers.backups?.value ?? "regular");
  applyFactor(
    "Data Backups",
    BACKUP_FACTORS[backups] ?? 1.0,
    answers.backups?.displayValue ?? backups
  );

  // 6. Endpoint security
  const endpoint = String(answers.endpoint_security?.value ?? "standard_av");
  applyFactor(
    "Endpoint Security",
    ENDPOINT_FACTORS[endpoint] ?? 1.0,
    answers.endpoint_security?.displayValue ?? endpoint
  );

  // 7. Prior incidents
  const incidents = answers.prior_incidents?.value;
  if (incidents !== undefined) {
    applyFactor(
      "Loss History",
      CYBER_CLAIMS_FACTORS[incidents as string | number] ?? 1.0,
      answers.prior_incidents?.displayValue ?? String(incidents)
    );
  }

  // 8. Deductible
  const deductible = Number(answers.deductible?.value ?? 10000);
  applyFactor(
    "Deductible",
    CYBER_DEDUCTIBLE_FACTORS[deductible] ?? 1.0,
    `$${deductible.toLocaleString()} deductible`
  );

  // 9. Security-awareness training
  const training = String(answers.security_training?.value ?? "annual");
  applyFactor(
    "Security Training",
    TRAINING_FACTORS[training] ?? 1.0,
    answers.security_training?.displayValue ?? training
  );

  // 10. Patch cadence
  const patch = String(answers.patch_cadence?.value ?? "monthly");
  applyFactor(
    "Patch Cadence",
    PATCH_FACTORS[patch] ?? 1.0,
    answers.patch_cadence?.displayValue ?? patch
  );

  // 11. Data encryption
  const encryption = String(answers.data_encryption?.value ?? "partial");
  applyFactor(
    "Data Encryption",
    ENCRYPTION_FACTORS[encryption] ?? 1.0,
    answers.data_encryption?.displayValue ?? encryption
  );

  // 12. Remote access
  const remote = String(answers.remote_access?.value ?? "vpn_only");
  applyFactor(
    "Remote Access",
    REMOTE_ACCESS_FACTORS[remote] ?? 1.0,
    answers.remote_access?.displayValue ?? remote
  );

  // 13. Third-party vendor dependency
  const vendor = String(answers.vendor_dependency?.value ?? "medium");
  applyFactor(
    "Vendor Reliance",
    VENDOR_DEPENDENCY_FACTORS[vendor] ?? 1.0,
    answers.vendor_dependency?.displayValue ?? vendor
  );

  // 14. Incident response plan
  const irPlan = String(answers.incident_response_plan?.value ?? "documented");
  applyFactor(
    "Incident Response Plan",
    IR_PLAN_FACTORS[irPlan] ?? 1.0,
    answers.incident_response_plan?.displayValue ?? irPlan
  );

  // 15. Flat loadings
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  if (answers.mfa_enabled?.value === "no") {
    applyFlat(
      "No MFA Loading",
      CYBER_FLAT_ADJUSTMENTS.no_mfa,
      "Multi-factor authentication not enforced"
    );
  }
  if (answers.endpoint_security?.value === "none") {
    applyFlat(
      "No Endpoint Loading",
      CYBER_FLAT_ADJUSTMENTS.no_endpoint,
      "No endpoint protection deployed"
    );
  }
  if (answers.incident_response_plan?.value === "none") {
    applyFlat(
      "No IR Plan Loading",
      CYBER_FLAT_ADJUSTMENTS.no_ir_plan,
      "No documented incident response plan"
    );
  }

  const finalAnnualPremium = Math.round(premium + flatTotal);
  const finalMonthlyPremium = Math.round(finalAnnualPremium / 12);

  return {
    ...uwDecision,
    basePremium,
    finalAnnualPremium,
    finalMonthlyPremium,
    coverageAmount: Math.round(coverageLimit),
    deductible,
    factors,
  };
}
