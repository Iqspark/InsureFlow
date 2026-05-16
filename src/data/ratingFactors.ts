// ============================================================
// RATING FACTORS — PLUGGABLE ACTUARIAL DATA (CAD)
// ============================================================
// Replace the values in this file with your Excel-derived
// actuarial factors. All dollar amounts are in Canadian dollars.
//
// EXCEL TAB: "Rating Factors"
// Each table below corresponds to one Excel named range or tab.
// ============================================================

export const BASE_PREMIUM = 500; // Annual base premium in CAD

// ── PROVINCE / TERRITORY FACTORS ────────────────────────────
// Source: Excel tab "Province Factors"
// 1.00 = neutral, >1.00 = surcharge, <1.00 = discount
export const PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.05, // Alberta — hail, wildfire interface
  BC: 1.20, // British Columbia — earthquake, wildfire, flooding
  MB: 1.00, // Manitoba — base
  NB: 1.00, // New Brunswick — base
  NL: 1.08, // Newfoundland and Labrador — coastal, wind exposure
  NS: 1.08, // Nova Scotia — coastal, wind exposure
  NT: 1.30, // Northwest Territories — remote, extreme cold (also REFER)
  NU: 1.35, // Nunavut — very remote, extreme climate (also REFER)
  ON: 1.12, // Ontario — high-value market, urban demand
  PE: 0.95, // Prince Edward Island — low density, lower risk
  QC: 1.10, // Quebec — ice storms, spring flooding
  SK: 1.00, // Saskatchewan — base
  YT: 1.25, // Yukon — remote, permafrost, extreme cold (also REFER)
};

// ── VACANCY DURATION FACTORS ─────────────────────────────────
export const VACANCY_DURATION_FACTORS: Record<string, number> = {
  "0-6m":  1.00, // Under 6 months — base rate
  "6-12m": 1.15, // 6–12 months — 15% surcharge
  "1-3y":  1.35, // 1–3 years — 35% surcharge
  "3-5y":  1.60, // 3–5 years — 60% surcharge (also triggers REFER)
  "5y+":   0.00, // >5 years — DECLINE (handled by UW engine)
};

// ── PROPERTY TYPE FACTORS ─────────────────────────────────────
export const PROPERTY_TYPE_FACTORS: Record<string, number> = {
  single_family: 1.00,
  townhouse:     0.95,
  condo:         0.88,
  multi_family:  1.20,
  mobile:        0.00, // DECLINE
};

// ── INSPECTION FREQUENCY FACTORS ─────────────────────────────
export const INSPECTION_FREQUENCY_FACTORS: Record<string, number> = {
  weekly:     0.90, // 10% discount for regular supervision
  monthly:    1.00,
  occasional: 1.15,
  rarely:     1.35,
};

// ── SECURITY FEATURE FACTORS ──────────────────────────────────
export const SECURITY_FACTORS: Record<string, number> = {
  alarm_locks: 0.90, // 10% discount
  locks_only:  1.00,
  basic:       1.10,
  none:        1.25,
};

// ── PRIOR CLAIMS FACTORS ──────────────────────────────────────
export const PRIOR_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    1.00,
  1:    1.10,
  2:    1.25,
  "3+": 1.50,
};

// ── DEDUCTIBLE FACTORS ────────────────────────────────────────
export const DEDUCTIBLE_FACTORS: Record<number, number> = {
  1000:  1.10, // Lower deductible = higher premium
  2500:  1.00, // Base deductible
  5000:  0.90,
  10000: 0.80,
};

// ── COVERAGE PERCENT FACTORS ─────────────────────────────────
export const COVERAGE_PERCENT_FACTORS: Record<string, number> = {
  "100": 1.00,
  "90":  0.92,
  "80":  0.82,
};

// ── FLAT DOLLAR ADJUSTMENTS (CAD) ─────────────────────────────
// Applied after all multipliers
export const FLAT_ADJUSTMENTS = {
  unfenced_pool:      200, // $200 CAD/yr — unfenced pool
  has_damage:         150, // $150 CAD/yr — known property damage
  no_prior_insurance: 100, // $100 CAD/yr — coverage lapse
  utilities_active:    75, // $75 CAD/yr — active utilities
};

// ── DYNAMIC FACTORS (calculated from raw values) ─────────────

// Property value: scales from $350k CAD (1.0x) up — adjusted for
// Canadian real estate values which are higher than US baseline
export function getPropertyValueFactor(propertyValue: number): number {
  const baseValue = 350_000; // CAD baseline
  const scalePer350k = 0.12; // 12% increase per additional $350k
  const ratio = Math.max(0, (propertyValue - baseValue) / baseValue);
  return 1 + ratio * scalePer350k;
}

// Property age: older = higher risk
export function getYearBuiltFactor(yearBuilt: number): number {
  const age = new Date().getFullYear() - yearBuilt;
  if (age <= 10)  return 0.95;
  if (age <= 25)  return 1.00;
  if (age <= 50)  return 1.10;
  if (age <= 75)  return 1.25;
  return 1.45; // 75+ years — very old construction
}
