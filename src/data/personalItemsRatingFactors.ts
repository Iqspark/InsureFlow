// ============================================================
// PERSONAL ITEMS (VALUABLE ARTICLES) — RATING FACTORS (CAD)
// ============================================================
// A Valuable Articles schedule covers individually listed personal
// items (jewellery, watches, art, collectibles, cameras, instruments,
// etc.) against loss, theft, and damage — at home and, optionally,
// while carried away from home.
//
// Premium is driven by the SUM INSURED (total value of all scheduled
// items) at a base rate, then adjusted by risk multipliers and flat
// loadings — mirroring the jeweller calculator's structure.
// ============================================================

// Base rate applied to the total insured value (sum insured).
// 1.5% of sum insured for a baseline well-secured schedule.
export const ITEMS_BASE_RATE = 0.015;

// ── ITEM CATEGORY FACTORS ────────────────────────────────────
export const ITEM_CATEGORY_FACTORS: Record<string, number> = {
  jewellery_watches:  1.10, // high theft/portability exposure
  fine_art:           1.20, // fragile, value volatility (also REFER)
  collectibles:       1.05,
  cameras_electronics: 1.00,
  musical_instruments: 1.05,
  sports_equipment:   0.95,
  other:              1.00,
};

// ── PROVINCE / LOCATION CRIME FACTORS ────────────────────────
// Weighted for metro property-crime exposure.
export const ITEMS_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.08,
  BC: 1.18, // Greater Vancouver
  MB: 1.05,
  NB: 1.00,
  NL: 1.00,
  NS: 1.05,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.15, // Greater Toronto
  PE: 0.95,
  QC: 1.12, // Montreal
  SK: 1.05,
  YT: 1.25, // remote (also REFER)
};

// ── STORAGE SECURITY FACTORS ─────────────────────────────────
export const STORAGE_SECURITY_FACTORS: Record<string, number> = {
  bank_vault:      0.80, // bank vault / safe deposit box
  home_safe_alarm: 0.95, // home safe + monitored alarm
  alarm_only:      1.20, // monitored alarm only
  none:            1.50, // no special security (also REFER)
};

// ── PROFESSIONAL APPRAISAL FACTORS (within 3 years?) ─────────
export const APPRAISAL_FACTORS: Record<string, number> = {
  yes: 0.95, // current professional appraisal
  no:  1.20, // no recent appraisal (also REFER)
};

// ── CARRIED OUTSIDE THE HOME SURCHARGE ───────────────────────
// Applied only when items are regularly carried/worn off-premises.
export const CARRIED_OUTSIDE_FACTOR = 1.25;

// ── PRIOR LOSS HISTORY FACTORS (loss/theft/damage, 5 yrs) ────
export const ITEMS_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const ITEMS_DEDUCTIBLE_FACTORS: Record<number, number> = {
  0:    1.15,
  500:  1.00,
  1000: 0.92,
  2500: 0.82,
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const ITEMS_FLAT_ADJUSTMENTS = {
  high_single_item: 150, // a single item valued above $50k
  carried_outside:  100, // items regularly carried off-premises
};
