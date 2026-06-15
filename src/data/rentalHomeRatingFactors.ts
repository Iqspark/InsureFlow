// ============================================================
// RENTAL HOMES (LANDLORD) — RATING FACTORS (CAD)
// ============================================================
// Landlord cover insures the building (and landlord contents) of a
// tenanted residential property against fire, water, theft, and
// liability perils.
//
// Premium is driven by the SUM INSURED (estimated rebuild value) at
// a base rate, then adjusted by risk multipliers and flat loadings —
// mirroring the vacant-home / jeweller calculator structure.
// ============================================================

// Base rate applied to the rebuild value (sum insured).
// ~0.4% of rebuild value for a baseline well-let property.
export const RENTAL_BASE_RATE = 0.004;

// ── PROVINCE / LOCATION FACTORS ──────────────────────────────
// Weighted for regional weather, water, and property-crime exposure.
export const RENTAL_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.05,
  BC: 1.15, // wildfire / water
  MB: 1.05,
  NB: 1.00,
  NL: 1.05,
  NS: 1.05,
  NT: 1.30, // remote (also REFER)
  NU: 1.35, // remote (also REFER)
  ON: 1.10, // GTA water/sewer backup
  PE: 0.95,
  QC: 1.08,
  SK: 1.05,
  YT: 1.25, // remote (also REFER)
};

// ── PROPERTY TYPE FACTORS ────────────────────────────────────
export const PROPERTY_TYPE_FACTORS: Record<string, number> = {
  detached:        1.00,
  semi_townhouse:  1.05, // shared walls / party-wall spread
  condo:           0.90, // unit only; building covered by corp policy
  multi_2_4:       1.20, // multiple tenancies
  apartment_5plus: 1.50, // commercial habitational (also REFER)
};

// ── YEAR BUILT → AGE BAND FACTORS ────────────────────────────
// Older properties carry greater wiring/plumbing/roof risk.
export function getYearBuiltFactor(yearBuilt: number): number {
  const age = new Date().getFullYear() - yearBuilt;
  if (age < 10)  return 0.92; // newer build
  if (age < 30)  return 1.00;
  if (age < 50)  return 1.10;
  if (age < 75)  return 1.25;
  return 1.45; // pre-1950 era (also REFER)
}

// ── TENANT TYPE FACTORS ──────────────────────────────────────
export const TENANT_TYPE_FACTORS: Record<string, number> = {
  long_term_family: 0.95,
  professionals:    1.00,
  students:         1.25, // higher turnover / damage frequency
  short_term:       1.40, // commercial occupancy (also REFER)
  subsidized:       1.10,
};

// ── OCCUPANCY STATUS FACTORS ─────────────────────────────────
export const OCCUPANCY_STATUS_FACTORS: Record<string, number> = {
  fully_occupied:     1.00,
  partially_occupied: 1.15, // partial vacancy exposure
  vacant:             1.50, // not eligible — use Vacant Home (also REFER)
};

// ── PRIOR CLAIMS FACTORS (property, 5 yrs) ───────────────────
export const RENTAL_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── WORKING SMOKE / CO ALARM FACTORS ─────────────────────────
export const SMOKE_ALARM_FACTORS: Record<string, number> = {
  yes: 1.00,
  no:  1.25, // missing/non-working protection (also REFER)
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const RENTAL_DEDUCTIBLE_FACTORS: Record<number, number> = {
  1000:  1.10,
  2500:  1.00,
  5000:  0.92,
  10000: 0.82,
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const RENTAL_FLAT_ADJUSTMENTS = {
  partial_vacancy: 200, // partially occupied property
  student_let:     150, // student tenancy admin/turnover loading
};
