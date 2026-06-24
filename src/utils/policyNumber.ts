import { productSlugForPolicyType } from "@/data/products";

// Per-product reference prefix for the human-readable policy/application number.
const PREFIX: Record<string, string> = {
  "vacant-home": "VH",
  "jeweller-block": "JB",
  "cyber-liability": "CY",
  contractor: "CON",
  "architects-engineers": "AE",
  retailers: "RET",
  "rental-home": "RH",
  "personal-items": "PI",
  "lithium-batteries": "LB",
  farm: "FRM",
};

// Stable, human-friendly reference shown everywhere instead of the raw cuid:
//   {PREFIX}-{YEAR}-{CODE}   e.g. "VH-2026-7K3M9Q"
// Derived from immutable fields, so the same submission always renders the same
// number across the UI, PDF, and emails.
export function policyNumber(sub: {
  id: string;
  policyType: string;
  createdAt: Date | string;
}): string {
  const prefix = PREFIX[productSlugForPolicyType(sub.policyType)] ?? "POL";
  const year = new Date(sub.createdAt).getFullYear();
  const code = sub.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${prefix}-${year}-${code}`;
}
