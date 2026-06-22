// ============================================================
// JEWELLER'S BLOCK — RATING FACTORS (CAD)
// ============================================================
// Jeweller's Block covers a jeweller's stock (jewellery, gems,
// precious metals) against theft, burglary, robbery, and damage —
// on premises, in the safe/vault, in windows, and in transit.
//
// Premium is driven by the SUM INSURED (max stock value at any one
// time) at a base rate, then adjusted by risk multipliers and flat
// loadings — mirroring the vacant-home calculator's structure.
// ============================================================

// Base rate applied to the maximum stock value (sum insured).
// 1.0% of sum insured for a baseline well-run retailer.
export const JEWELLER_BASE_RATE = 0.01;

// ── BUSINESS TYPE FACTORS ────────────────────────────────────
export const BUSINESS_TYPE_FACTORS: Record<string, number> = {
  retail:        1.00,
  wholesale:     1.10, // larger consignments, dealer-to-dealer movement
  manufacturer:  1.15, // work-in-progress, loose stones, processes on site
  pawnbroker:    1.40, // high-risk class (also REFER)
  online_only:   1.20, // no fixed retail security envelope (also REFER)
};

// ── PROVINCE / LOCATION CRIME FACTORS ────────────────────────
// Weighted for metro property-crime / smash-and-grab exposure.
export const JEWELLER_PROVINCE_FACTORS: Record<string, number> = {
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

// ── YEARS IN BUSINESS FACTORS ────────────────────────────────
export function getYearsInBusinessFactor(years: number): number {
  if (years < 1)  return 1.30; // new venture (also REFER)
  if (years < 3)  return 1.10;
  if (years < 10) return 1.00;
  return 0.92; // established trader
}

// ── % OF STOCK IN A RATED SAFE/VAULT OVERNIGHT ───────────────
export const STOCK_IN_SAFE_FACTORS: Record<string, number> = {
  all:       0.85, // 100% locked away overnight
  most:      1.00, // 75–99%
  half:      1.20, // 50–74%
  under_half: 1.45, // <50% (also REFER)
  none:      1.60, // nothing secured overnight (also DECLINE)
};

// ── SAFE / VAULT GRADE FACTORS ───────────────────────────────
export const SAFE_RATING_FACTORS: Record<string, number> = {
  vault_high:  0.80, // TL-30 / TRTL high-grade vault
  rated_safe:  0.95, // TL-15 / grade-rated jewellers' safe
  fire_safe:   1.20, // fire safe only (not burglary rated)
  cabinet:     1.50, // locking cabinet/showcase only (also REFER)
  none:        1.70, // no secure container (also DECLINE)
};

// ── BURGLAR ALARM GRADE FACTORS ──────────────────────────────
export const ALARM_FACTORS: Record<string, number> = {
  central_safe:     0.85, // UL/ULC central station + safe/vault contacts
  central_premises: 1.00, // central station, premises only
  local_only:       1.30, // local audible bell only (also REFER)
  none:             1.60, // no alarm (also DECLINE)
};

// ── VALUE OF STOCK LEFT IN DISPLAY WINDOWS AFTER HOURS ───────
export const WINDOW_DISPLAY_FACTORS: Record<string, number> = {
  emptied:   0.95, // windows emptied nightly
  under_10k: 1.05,
  k10_50:    1.20,
  over_50k:  1.40, // high smash-and-grab exposure (also REFER)
};

// ── OFF-PREMISES / TRANSIT VALUE FACTORS ─────────────────────
// Applied only when the jeweller carries stock off-site.
export const OFFSITE_VALUE_FACTORS: Record<string, number> = {
  under_25k: 1.05,
  k25_100:   1.15,
  over_100k: 1.35, // large unattended conveyance exposure (also REFER)
};

// ── PRIOR LOSS HISTORY FACTORS (theft/burglary/robbery, 5 yrs) ─
export const JEWELLER_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const JEWELLER_DEDUCTIBLE_FACTORS: Record<number, number> = {
  2500:  1.10,
  5000:  1.00,
  10000: 0.90,
  25000: 0.78,
};

// ── PRINCIPAL PRODUCT WORKED WITH ────────────────────────────
// Diamonds/loose stones are the highest-value, most-targeted class.
export const PRODUCT_FOCUS_FACTORS: Record<string, number> = {
  watches:   0.95, // serialised, traceable
  gold:      1.00, // precious metal, scrap-recoverable
  mixed:     1.05, // general jewellery mix
  diamonds:  1.20, // high value-density, hard to trace
};

// ── % OF STOCK HELD ON CONSIGNMENT / MEMO ────────────────────
// Memo stock raises values-at-risk and third-party recovery disputes.
export const CONSIGNMENT_FACTORS: Record<string, number> = {
  none:    0.95, // owned outright
  low:     1.00, // under 25%
  medium:  1.15, // 25–50%
  high:    1.35, // over 50% (also REFER)
};

// ── ON-SITE SECURITY MEASURES ────────────────────────────────
export const ENTRY_CONTROL_FACTORS: Record<string, number> = {
  mantrap:       0.85, // mantrap / double-door interlock + buzzer
  buzzer:        0.95, // buzzer / locked-door entry
  guard:         0.90, // on-site security guard during trading
  none:          1.15, // open-door, no access control
};

// ── CCTV COVERAGE ────────────────────────────────────────────
export const CCTV_FACTORS: Record<string, number> = {
  full_recorded: 0.90, // full coverage, recorded & monitored
  partial:       1.05, // partial coverage
  none:          1.30, // no CCTV (also REFER)
};

// ── ON-PREMISES REPAIRS / WORKSHOP ───────────────────────────
// A workshop adds work-in-progress, customers' goods, and tools/fire risk.
export const REPAIRS_FACTORS: Record<string, number> = {
  no:        1.00,
  yes:       1.10, // bench repairs on premises
};

// ── EMPLOYEE COUNT FACTOR ────────────────────────────────────
// More staff → greater internal-theft and access exposure.
export function getEmployeeCountFactor(count: number): number {
  if (count <= 2)  return 0.95; // owner-operated / very small
  if (count <= 5)  return 1.00;
  if (count <= 15) return 1.10;
  return 1.20; // large staff
}

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const JEWELLER_FLAT_ADJUSTMENTS = {
  high_window_value: 500, // >$50k left in windows overnight
  carries_offsite:   250, // any regular off-premises carryings
};
