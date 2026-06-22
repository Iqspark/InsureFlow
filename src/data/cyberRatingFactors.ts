// ============================================================
// CYBER LIABILITY — RATING FACTORS (CAD)
// ============================================================
// Cyber Liability covers a business against the costs of a data
// breach or cyber attack — incident response, data restoration,
// business interruption, extortion, regulatory defence, and
// third-party liability.
//
// Premium is driven by the chosen AGGREGATE LIMIT at a base rate,
// then adjusted by revenue, industry, data exposure, security
// controls, loss history, and the deductible — mirroring the
// jeweller-block calculator's structure.
// ============================================================

// Base rate applied to the chosen aggregate limit.
// 1.2% of the aggregate limit for a baseline well-controlled risk.
export const CYBER_BASE_RATE = 0.012;

// ── INDUSTRY THREAT-PROFILE FACTORS ──────────────────────────
export const INDUSTRY_FACTORS: Record<string, number> = {
  professional:  1.00,
  retail:        1.20, // PCI exposure, e-commerce attack surface
  healthcare:    1.45, // regulated PHI, frequent target (also REFER)
  financial:     1.40, // high-value target, heavy regulation (also REFER)
  manufacturing: 1.10, // OT/ransomware downtime exposure
  technology:    1.15, // SaaS supply-chain / aggregation
  other:         1.05,
};

// ── ANNUAL REVENUE FACTORS ───────────────────────────────────
// Larger organisations present a bigger attack surface and record set.
export function getRevenueFactor(revenue: number): number {
  if (revenue < 1000000)    return 0.90; // micro
  if (revenue < 10000000)   return 1.00; // small
  if (revenue < 50000000)   return 1.15; // mid-market
  if (revenue < 250000000)  return 1.30; // large
  return 1.50; // enterprise (also REFER above $250M)
}

// ── SENSITIVE RECORDS HELD (PII / PCI) ───────────────────────
export const RECORDS_HELD_FACTORS: Record<string, number> = {
  under_10k: 0.90,
  k10_100:   1.00,
  k100_1m:   1.20,
  over_1m:   1.45, // large aggregation exposure (also REFER)
};

// ── MULTI-FACTOR AUTHENTICATION FACTORS ──────────────────────
export const MFA_FACTORS: Record<string, number> = {
  yes: 0.85, // MFA enforced
  no:  1.40, // not enforced (also REFER)
};

// ── BACKUP STRATEGY FACTORS ──────────────────────────────────
export const BACKUP_FACTORS: Record<string, number> = {
  immutable: 0.85, // tested offline / immutable backups
  regular:   1.00, // regular backups
  none:      1.60, // no backups (also DECLINE)
};

// ── ENDPOINT SECURITY FACTORS ────────────────────────────────
export const ENDPOINT_FACTORS: Record<string, number> = {
  edr:         0.85, // EDR / managed detection
  standard_av: 1.00, // standard antivirus
  none:        1.50, // no endpoint protection (also REFER)
};

// ── PRIOR INCIDENT HISTORY FACTORS (cyber, 5 yrs) ────────────
export const CYBER_CLAIMS_FACTORS: Record<string | number, number> = {
  0:    0.95,
  1:    1.20,
  2:    1.45,
  "3+": 1.70, // also REFER
};

// ── DEDUCTIBLE FACTORS (CAD) ─────────────────────────────────
export const CYBER_DEDUCTIBLE_FACTORS: Record<number, number> = {
  5000:  1.10,
  10000: 1.00,
  25000: 0.90,
  50000: 0.80,
};

// ── SECURITY AWARENESS TRAINING FACTORS ──────────────────────
export const TRAINING_FACTORS: Record<string, number> = {
  ongoing:  0.90, // regular phishing simulations + training
  annual:   1.00, // once-a-year training
  none:     1.25, // no employee security training
};

// ── PATCH / VULNERABILITY MANAGEMENT FACTORS ─────────────────
export const PATCH_FACTORS: Record<string, number> = {
  auto:      0.88, // automated, within days
  monthly:   1.00, // routine monthly cadence
  ad_hoc:    1.30, // ad-hoc / no defined cadence
};

// ── ENCRYPTED-BACKUPS / DATA-AT-REST ENCRYPTION FACTORS ──────
export const ENCRYPTION_FACTORS: Record<string, number> = {
  yes:     0.90, // sensitive data + backups encrypted
  partial: 1.05, // partially encrypted
  no:      1.30, // not encrypted
};

// ── REMOTE ACCESS / VPN FACTORS ──────────────────────────────
export const REMOTE_ACCESS_FACTORS: Record<string, number> = {
  vpn_mfa:    0.90, // VPN/ZTNA with MFA
  vpn_only:   1.05, // VPN without MFA
  rdp_open:   1.40, // direct RDP exposed to internet (also REFER)
  none:       0.95, // no remote access
};

// ── THIRD-PARTY VENDOR DEPENDENCY FACTORS ────────────────────
export const VENDOR_DEPENDENCY_FACTORS: Record<string, number> = {
  low:     0.95, // minimal critical-vendor reliance
  medium:  1.10, // some critical SaaS/IT vendors
  high:    1.30, // heavy reliance on critical third parties
};

// ── INCIDENT RESPONSE PLAN FACTORS ───────────────────────────
export const IR_PLAN_FACTORS: Record<string, number> = {
  tested:    0.88, // documented + tested in last 12 months
  documented:1.00, // documented but untested
  none:      1.25, // no incident response plan
};

// ── FLAT DOLLAR LOADINGS (CAD) — applied after multipliers ───
export const CYBER_FLAT_ADJUSTMENTS = {
  no_mfa:       1000, // MFA not enforced — elevated breach likelihood
  no_endpoint:   750, // no endpoint protection deployed
  no_ir_plan:    500, // no incident response plan
};
