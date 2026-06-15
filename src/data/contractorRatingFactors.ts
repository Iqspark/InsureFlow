// ============================================================
// CONTRACTOR (GENERAL LIABILITY) — RATING FACTORS (CAD)
// ============================================================
// Contractor GL covers a contractor's third-party bodily-injury
// and property-damage liability arising out of their operations,
// products, and completed work.
//
// Premium is turnover-rated: driven by ANNUAL REVENUE at a base
// rate, then adjusted by trade hazard, location, experience,
// subcontracting, work-at-height, claims, and deductible
// multipliers and flat loadings — mirroring the jeweller-block
// calculator's structure.
// ============================================================

// Base rate applied to annual revenue (turnover-rated GL).
// 0.4% of revenue for a baseline well-run contractor.
export const CONTRACTOR_BASE_RATE = 0.004;

// ── TRADE HAZARD FACTORS ─────────────────────────────────────
export const TRADE_TYPE_FACTORS: Record<string, number> = {
  carpentry:     1.00,
  electrical:    1.15, // fire / electrocution exposure
  plumbing_hvac: 1.10, // water damage / gas exposure
  roofing:       1.60, // high hazard — falls, fire (also REFER)
  excavation:    1.55, // high hazard — collapse, underground (also REFER)
  landscaping:   0.90, // generally lower hazard
  painting:      0.95,
  other:         1.20, // unknown class — conservative loading
};

// ── PROVINCE / LOCATION FACTORS ──────────────────────────────
// Weighted for regional litigation and construction-cost exposure.
export const CONTRACTOR_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.08,
  BC: 1.15, // higher construction costs / litigation
  MB: 1.02,
  NB: 1.00,
  NL: 1.00,
  NS: 1.03,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.18, // Greater Toronto exposure
  PE: 0.95,
  QC: 1.10,
  SK: 1.02,
  YT: 1.25, // remote (also REFER)
};

// ── YEARS IN BUSINESS FACTORS ────────────────────────────────
export function getYearsInBusinessFactor(years: number): number {
  if (years < 1)  return 1.30; // new venture (also REFER)
  if (years < 3)  return 1.12;
  if (years < 10) return 1.00;
  return 0.90; // established operator
}

// ── ANNUAL REVENUE BAND FACTORS ──────────────────────────────
// A mild volume adjustment layered on top of the turnover base.
export function getRevenueFactor(revenue: number): number {
  if (revenue < 250000)   return 1.10; // small operator, fixed-cost heavy
  if (revenue < 1000000)  return 1.00;
  if (revenue < 5000000)  return 0.95;
  return 0.90; // large account — economies of scale
}

// ── SUBCONTRACTOR USE FACTORS ────────────────────────────────
export const SUBCONTRACTOR_FACTORS: Record<string, number> = {
  none:       0.95, // own crew only
  occasional: 1.05, // occasional certified subs
  frequent:   1.30, // frequent subcontracting (also REFER)
};

// ── WORK-AT-HEIGHT DETAIL FACTORS ────────────────────────────
// Applied only when the contractor works at height.
export const HEIGHT_DETAIL_FACTORS: Record<string, number> = {
  up_to_3: 1.10,
  "3_to_6": 1.25,
  over_6:  1.50, // elevated fall exposure (also REFER)
};

// ── PRIOR CLAIMS HISTORY FACTORS (liability, 5 yrs) ──────────
export const CONTRACTOR_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const CONTRACTOR_DEDUCTIBLE_FACTORS: Record<number, number> = {
  1000:  1.10,
  2500:  1.00,
  5000:  0.92,
  10000: 0.82,
};

// ── COVERAGE LIMIT FACTORS (GL aggregate, CAD) ───────────────
export const COVERAGE_LIMIT_FACTORS: Record<number, number> = {
  1000000:  0.90,
  2000000:  1.00,
  5000000:  1.20,
  10000000: 1.40,
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const CONTRACTOR_FLAT_ADJUSTMENTS = {
  works_at_height: 350, // any regular work at height
  frequent_subs:   250, // frequent subcontracting administration loading
};
