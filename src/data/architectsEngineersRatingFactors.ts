// ============================================================
// ARCHITECTS & ENGINEERS (PROFESSIONAL INDEMNITY) — RATING FACTORS (CAD)
// ============================================================
// Professional Indemnity covers an architecture / engineering firm
// against claims of professional negligence in its design and advice.
//
// Premium is driven by the firm's ANNUAL FEE INCOME at a base rate,
// then adjusted by risk multipliers (discipline, province, experience,
// work mix, QA, claims) and the chosen deductible — mirroring the
// jeweller-block calculator's structure.
// ============================================================

// Base rate applied to annual fee income.
// 5.0% of fee income for a baseline well-run, low-hazard practice.
export const AE_BASE_RATE = 0.05;

// ── DISCIPLINE FACTORS ───────────────────────────────────────
// Weighted for professional-negligence hazard by area of practice.
export const AE_DISCIPLINE_FACTORS: Record<string, number> = {
  architecture: 1.00,
  structural:   1.35, // load-bearing design — high hazard (also REFER)
  civil:        1.30, // infrastructure design — high hazard (also REFER)
  mech_elec:    1.10,
  multi:        1.15, // broad exposure across disciplines
  other:        1.20,
};

// ── PROVINCE / LITIGATION CLIMATE FACTORS ────────────────────
// Weighted for local construction-litigation frequency.
export const AE_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.05,
  BC: 1.18, // active construction-defect litigation
  MB: 1.00,
  NB: 0.98,
  NL: 1.00,
  NS: 1.02,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.15, // high project volume / litigation
  PE: 0.95,
  QC: 1.10,
  SK: 1.00,
  YT: 1.25, // remote (also REFER)
};

// ── YEARS PRACTISING FACTORS ─────────────────────────────────
export function getYearsFactor(years: number): number {
  if (years < 2)  return 1.30; // new firm (also REFER)
  if (years < 5)  return 1.12;
  if (years < 15) return 1.00;
  return 0.90; // long, established track record
}

// ── ANNUAL FEE INCOME BAND FACTORS ───────────────────────────
// Larger firms carry larger and more complex projects.
export function getFeeIncomeFactor(feeIncome: number): number {
  if (feeIncome < 250000)    return 0.95; // small practice
  if (feeIncome < 1000000)   return 1.00;
  if (feeIncome < 5000000)   return 1.10;
  if (feeIncome < 25000000)  return 1.25;
  return 1.40; // very large book (also REFER)
}

// ── WORK-MIX FACTORS (structural / forensic share) ───────────
export const AE_WORK_MIX_FACTORS: Record<string, number> = {
  none:     0.90,
  under_25: 1.00,
  "25_50":  1.20,
  over_50:  1.45, // high-hazard work mix (also REFER)
};

// ── QA / PEER-REVIEW PROCESS FACTORS ─────────────────────────
export const AE_QA_FACTORS: Record<string, number> = {
  yes: 0.92, // documented QA / peer review
  no:  1.25, // no documented QA process (also REFER)
};

// ── PRIOR CLAIMS HISTORY FACTORS (PI claims, 5 yrs) ──────────
export const AE_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.40,
  "3+": 1.70, // also REFER
};

// ── COVERAGE LIMIT FACTORS (PI limit, CAD) ───────────────────
// Higher limits cost more, but at a decreasing marginal rate.
export const AE_COVERAGE_LIMIT_FACTORS: Record<number, number> = {
  250000:  0.80,
  500000:  0.90,
  1000000: 1.00,
  2000000: 1.25,
  5000000: 1.60,
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const AE_DEDUCTIBLE_FACTORS: Record<number, number> = {
  5000:  1.10,
  10000: 1.00,
  25000: 0.90,
  50000: 0.80,
};
