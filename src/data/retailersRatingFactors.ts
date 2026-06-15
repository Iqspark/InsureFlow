// ============================================================
// RETAILERS (COMMERCIAL PACKAGE) — RATING FACTORS (CAD)
// ============================================================
// A retail commercial package covers a store's stock, contents,
// fixtures and equipment against fire, theft, and damage, plus a
// general liability section driven by turnover.
//
// Premium is driven by the SUM INSURED (stock & contents value) at
// a base rate, then adjusted by risk multipliers and flat loadings —
// mirroring the jeweller calculator's structure.
// ============================================================

// Base rate applied to the stock & contents value (sum insured).
// 1.5% of sum insured for a baseline well-run retailer.
export const RETAIL_BASE_RATE = 0.015;

// ── STORE TYPE FACTORS ───────────────────────────────────────
export const STORE_TYPE_FACTORS: Record<string, number> = {
  apparel:     0.95,
  electronics: 1.20, // high theft attraction, high value-density stock
  grocery:     1.05, // spoilage / high footfall
  furniture:   1.00,
  hardware:    1.00,
  restaurant:  1.25, // cooking / fire exposure
  cannabis:    1.40, // regulated, high theft attraction (also REFER)
  other:       1.10,
};

// ── PROVINCE / LOCATION FACTORS ──────────────────────────────
// Weighted for metro property-crime and weather exposure.
export const RETAIL_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.08,
  BC: 1.15, // Greater Vancouver
  MB: 1.05,
  NB: 1.00,
  NL: 1.00,
  NS: 1.05,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.12, // Greater Toronto
  PE: 0.95,
  QC: 1.10, // Montreal
  SK: 1.05,
  YT: 1.25, // remote (also REFER)
};

// ── BUILDING CONSTRUCTION FACTORS ────────────────────────────
export const CONSTRUCTION_FACTORS: Record<string, number> = {
  masonry:    0.90, // masonry / concrete
  mixed:      1.00,
  wood_frame: 1.30, // higher fire exposure (surcharge)
};

// ── FIRE PROTECTION FACTORS ──────────────────────────────────
export const FIRE_PROTECTION_FACTORS: Record<string, number> = {
  sprinklered_monitored: 0.85, // sprinklered + monitored alarm
  monitored_alarm:       1.00, // monitored alarm only
  extinguishers:         1.25, // extinguishers only (surcharge)
  none:                  1.60, // no fire protection (also DECLINE)
};

// ── BURGLAR ALARM FACTORS ────────────────────────────────────
export const BURGLAR_ALARM_FACTORS: Record<string, number> = {
  central: 0.90, // central station monitoring
  local:   1.15, // local audible bell only (surcharge)
  none:    1.40, // no alarm (also REFER)
};

// ── PRIOR CLAIMS HISTORY FACTORS (5 yrs) ─────────────────────
export const RETAIL_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const RETAIL_DEDUCTIBLE_FACTORS: Record<number, number> = {
  1000:  1.15,
  2500:  1.00,
  5000:  0.90,
  10000: 0.80,
};

// ── GENERAL LIABILITY LOADING (CAD) — by annual turnover band ─
// Flat liability premium added on top of the property multipliers.
export function getTurnoverLiabilityLoading(turnover: number): number {
  if (turnover < 250000)   return 350;
  if (turnover < 1000000)  return 600;
  if (turnover < 5000000)  return 1200;
  return 2500;
}
