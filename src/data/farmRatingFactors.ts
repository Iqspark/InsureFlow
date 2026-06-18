// ============================================================
// FARM INSURANCE — RATING FACTORS (CAD)
// ============================================================
// Farm cover protects the farm dwellings, outbuildings, equipment,
// and livestock plus farm liability. Premium is driven by the total
// SUM INSURED (buildings + equipment + livestock value) at a base
// rate, then adjusted by risk multipliers and flat loadings —
// mirroring the jeweller-block / vacant-home calculator structure.
// ============================================================

// Base rate applied to the total sum insured. 0.6% for a baseline
// well-run mixed farm.
export const FARM_BASE_RATE = 0.006;

// ── FARM OPERATION TYPE FACTORS ──────────────────────────────
export const FARM_TYPE_FACTORS: Record<string, number> = {
  crop:      1.00, // grain / cash crop
  livestock: 1.15, // beef, hogs, poultry — barn fire / mortality exposure
  dairy:     1.20, // high-value barns, equipment, herd
  mixed:     1.10, // crop + livestock
  hobby:     0.95, // small lifestyle / hobby farm
};

// ── PROVINCE / LOCATION FACTORS ──────────────────────────────
// Weighted for weather (hail/wind), wildfire, and fire-response distance.
export const FARM_PROVINCE_FACTORS: Record<string, number> = {
  AB: 1.12, // hail / wildfire
  BC: 1.15, // wildfire / interface
  MB: 1.08,
  NB: 1.00,
  NL: 1.00,
  NS: 1.02,
  NT: 1.35, // remote (also REFER)
  NU: 1.40, // remote (also REFER)
  ON: 1.05,
  PE: 0.98,
  QC: 1.05,
  SK: 1.10, // hail belt
  YT: 1.30, // remote (also REFER)
};

// ── YEARS FARMING FACTORS ────────────────────────────────────
export function getYearsFarmingFactor(years: number): number {
  if (years < 1)  return 1.25; // new operation (also REFER)
  if (years < 3)  return 1.10;
  if (years < 10) return 1.00;
  return 0.92; // established operator
}

// ── GROSS FARM REVENUE FACTORS ───────────────────────────────
// Larger operations carry more liability / business exposure.
export function getRevenueFactor(revenue: number): number {
  if (revenue < 100000)  return 0.98;
  if (revenue < 500000)  return 1.00;
  if (revenue < 1000000) return 1.05;
  return 1.10;
}

// ── DWELLING AGE FACTORS ─────────────────────────────────────
export function getDwellingAgeFactor(yearBuilt: number): number {
  const age = new Date().getFullYear() - yearBuilt;
  if (age < 25) return 0.98;
  if (age < 50) return 1.05;
  if (age < 75) return 1.12;
  return 1.20; // very old dwelling (pre-1920 also REFER)
}

// ── DWELLING CONSTRUCTION FACTORS ────────────────────────────
export const CONSTRUCTION_FACTORS: Record<string, number> = {
  masonry: 0.95, // brick / stone / concrete
  frame:   1.05, // wood frame
  log:     1.10,
  other:   1.05,
};

// ── ROOF AGE FACTORS ─────────────────────────────────────────
export const ROOF_AGE_FACTORS: Record<string, number> = {
  new:    0.95, // under 10 years
  mid:    1.05, // 10–20 years
  aging:  1.15, // 20–25 years
  old:    1.30, // 25+ years (also REFER)
};

// ── ELECTRICAL WIRING FACTORS ────────────────────────────────
export const WIRING_FACTORS: Record<string, number> = {
  copper:        1.00,
  aluminum:      1.10,
  mixed:         1.10,
  knob_and_tube: 1.40, // legacy fire exposure (also REFER)
};

// ── PLUMBING TYPE FACTORS ────────────────────────────────────
export const PLUMBING_FACTORS: Record<string, number> = {
  copper_plastic: 1.00,
  galvanized:     1.10,
  other:          1.05,
  poly_b:         1.25, // Poly-B failure exposure (also REFER)
};

// ── PRIMARY HEATING FACTORS ──────────────────────────────────
export const PRIMARY_HEATING_FACTORS: Record<string, number> = {
  electric:     1.00,
  natural_gas:  0.98,
  propane:      1.02,
  oil:          1.10,
  wood:         1.20, // solid-fuel as primary heat
};

// ── HEATING — WOOD / AUXILIARY SOLID-FUEL HEAT ───────────────
export const WOOD_HEAT_FACTORS: Record<string, number> = {
  none:        0.95, // no solid-fuel / wood heating
  certified:   1.10, // CSA/ULC/WH certified woodstove or furnace
  uncertified: 1.45, // uncertified solid-fuel heat (also REFER)
};

// ── FIRE PROTECTION / SECURITY FACTORS ───────────────────────
export const SMOKE_DETECTOR_FACTORS: Record<string, number> = {
  yes: 0.97,
  no:  1.20, // no smoke detectors (also REFER)
};

export const MONITORED_SECURITY_FACTORS: Record<string, number> = {
  yes: 0.95,
  no:  1.00,
};

// ── SWIMMING POOL FACTORS ────────────────────────────────────
export const POOL_FACTORS: Record<string, number> = {
  none:     1.00,
  fenced:   1.05,
  unfenced: 1.20, // attractive-nuisance liability (also REFER)
};

// ── NUMBER OF FARM BUILDINGS / STRUCTURES ────────────────────
export function getNumBuildingsFactor(count: number): number {
  if (count <= 1)  return 0.95;
  if (count <= 5)  return 1.00;
  if (count <= 10) return 1.10;
  return 1.20; // large building schedule, more aggregate exposure
}

// ── LIABILITY LIMIT FACTORS ──────────────────────────────────
export const LIABILITY_LIMIT_FACTORS: Record<number, number> = {
  1000000: 1.00,
  2000000: 1.08,
  5000000: 1.20,
};

// ── PRIOR LOSS HISTORY FACTORS (last 5 years) ────────────────
export const FARM_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.15,
  2:    1.35,
  "3+": 1.60, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const FARM_DEDUCTIBLE_FACTORS: Record<number, number> = {
  1000:  1.12,
  2500:  1.00,
  5000:  0.90,
  10000: 0.80,
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const FARM_FLAT_ADJUSTMENTS = {
  certified_wood_heat: 250, // any certified solid-fuel heating
  agritourism:         500, // public-access / agritourism operations
  boards_livestock:    350, // bailee exposure for others' animals
};
