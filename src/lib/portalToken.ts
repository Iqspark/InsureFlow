// Lifetime for the public pay / portal token. The same tokenized link gives
// access to a customer's policy details + PDF, so it must not live forever;
// re-binding / resending the payment link refreshes the window.

export const PORTAL_TOKEN_TTL_DAYS = 30;

export function portalTokenExpiry(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + PORTAL_TOKEN_TTL_DAYS);
  return d;
}

// Fail closed: a token with no recorded expiry (null) is treated as expired.
// Every link issued by binding/resending now stamps an expiry, so the only null
// tokens are legacy ones — resending the payment link refreshes a fresh window.
export function isPortalTokenExpired(expiresAt: Date | null, now: Date): boolean {
  if (expiresAt == null) return true;
  return expiresAt.getTime() < now.getTime();
}
