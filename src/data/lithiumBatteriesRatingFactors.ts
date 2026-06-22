// ============================================================
// LITHIUM BATTERIES (PRODUCT LIABILITY) — RATING FACTORS (CAD)
// ============================================================
// Product liability covers third-party bodily injury and property
// damage caused by a defective lithium-battery product — including
// thermal-runaway fires, recall-driven losses, and claims arising
// from the insured's role in the supply chain.
//
// Premium is driven by ANNUAL TURNOVER at a base rate, then adjusted
// by risk multipliers and flat loadings — mirroring the jeweller
// calculator's structure.
// ============================================================

// Base rate applied to annual turnover (turnover-rated product liability).
// 0.8% of turnover for a baseline well-controlled distributor.
export const BATTERY_BASE_RATE = 0.008;

// ── SUPPLY-CHAIN ROLE FACTORS ────────────────────────────────
export const BUSINESS_ROLE_FACTORS: Record<string, number> = {
  manufacturer: 1.45, // primary product liability (also REFER)
  importer:     1.35, // brand owner carries primary liability (also REFER)
  distributor:  1.10,
  reseller:     1.00,
};

// ── PROVINCE / LOCATION FACTORS ──────────────────────────────
// Weighted for litigation climate and distribution/recall reach.
export const BATTERY_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.05,
  BC: 1.10,
  MB: 1.00,
  NB: 1.00,
  NL: 1.00,
  NS: 1.02,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.15, // largest market / litigation exposure
  PE: 0.98,
  QC: 1.12,
  SK: 1.00,
  YT: 1.25, // remote (also REFER)
};

// ── BATTERY CHEMISTRY FACTORS ────────────────────────────────
export const BATTERY_CHEMISTRY_FACTORS: Record<string, number> = {
  li_ion:   1.05, // consumer Li-ion cells
  li_poly:  1.10, // li-polymer
  lifepo4:  0.90, // lower thermal-runaway hazard
  li_metal: 1.40, // primary lithium-metal (also REFER)
  mixed:    1.15, // mixed chemistries
};

// ── END-USE APPLICATION FACTORS ──────────────────────────────
export const APPLICATION_FACTORS: Record<string, number> = {
  consumer_electronics: 1.00,
  power_tools:          1.05,
  e_mobility:           1.40, // e-bike/scooter fire recalls (also REFER)
  ev_automotive:        1.50, // high recall/bodily-injury exposure (also REFER)
  energy_storage:       1.20,
  other:                1.10,
};

// ── ANNUAL TURNOVER BAND FACTORS ─────────────────────────────
// Larger turnover spreads fixed exposure but raises aggregate claim potential.
export function getTurnoverBandFactor(turnover: number): number {
  if (turnover < 500_000)    return 1.00;
  if (turnover < 2_000_000)  return 1.05;
  if (turnover < 10_000_000) return 1.10;
  if (turnover < 50_000_000) return 1.20;
  return 1.30; // >$50M (also REFER)
}

// ── SAFETY CERTIFICATION FACTORS ─────────────────────────────
export const CERTIFICATION_FACTORS: Record<string, number> = {
  ul_audited:     0.85, // UL/IEC certified + factory audited
  ul_certified:   0.95, // UL/IEC certified
  self_certified: 1.35, // self-certified / CE only (also REFER)
  none:           1.70, // uncertified (also DECLINE)
};

// ── RECALL HISTORY FACTORS (last 5 yrs) ──────────────────────
export const RECALL_HISTORY_FACTORS: Record<string, number> = {
  yes: 1.40, // prior recall (also REFER)
  no:  1.00,
};

// ── PRIOR CLAIMS HISTORY FACTORS (product liability, 5 yrs) ──
export const BATTERY_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const BATTERY_DEDUCTIBLE_FACTORS: Record<number, number> = {
  5000:  1.10,
  10000: 1.00,
  25000: 0.90,
  50000: 0.80,
};

// ── COUNTRY OF MANUFACTURE FACTORS ───────────────────────────
// Reflects QA maturity, factory-audit access, and recall logistics.
export const MANUFACTURE_COUNTRY_FACTORS: Record<string, number> = {
  canada:        0.90,
  usa:           0.92,
  western_europe:0.92,
  japan_korea:   0.95,
  china:         1.15,
  other_asia:    1.20,
  other:         1.10,
};

// ── ANNUAL UNITS SOLD BAND FACTORS ───────────────────────────
// More units in the field raises the probability of a defective unit reaching a claimant.
export function getUnitsSoldBandFactor(units: number): number {
  if (units < 1_000)      return 0.95;
  if (units < 10_000)     return 1.00;
  if (units < 100_000)    return 1.10;
  if (units < 1_000_000)  return 1.20;
  return 1.30; // >1M units in the field
}

// ── US-MARKET DISTRIBUTION FACTORS ───────────────────────────
// US product-liability litigation severity is materially higher.
export const USA_SALES_FACTORS: Record<string, number> = {
  none:    1.00, // not sold in the USA
  some:    1.25, // some US distribution
  primary: 1.45, // USA is the primary market
};

// ── UN38.3 TRANSPORT COMPLIANCE FACTORS ──────────────────────
export const UN38_3_FACTORS: Record<string, number> = {
  yes:     0.92, // fully UN38.3 tested for transport
  partial: 1.10, // some SKUs untested
  no:      1.30, // not UN38.3 compliant
};

// ── THIRD-PARTY TESTING FACTORS ──────────────────────────────
export const THIRD_PARTY_TESTING_FACTORS: Record<string, number> = {
  ongoing:   0.88, // ongoing independent batch testing
  initial:   0.97, // initial type-test only
  none:      1.25, // no independent testing
};

// ── BATCH TRACEABILITY FACTORS ───────────────────────────────
// Serial/batch tracking limits the scope and cost of a recall.
export const TRACEABILITY_FACTORS: Record<string, number> = {
  full:    0.90, // full per-unit/batch traceability
  partial: 1.05, // batch-level only
  none:    1.25, // no traceability
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const BATTERY_FLAT_ADJUSTMENTS = {
  prior_recall: 1500, // flat loading for any product recall in the last 5 years
};
