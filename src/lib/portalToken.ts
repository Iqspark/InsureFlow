// Lifetime for the public pay / portal token. The same tokenized link gives
// access to a customer's policy details + PDF, so it must not live forever;
// re-binding / resending the payment link refreshes the window.

export const PORTAL_TOKEN_TTL_DAYS = 30;

export function portalTokenExpiry(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + PORTAL_TOKEN_TTL_DAYS);
  return d;
}

// Legacy tokens issued before expiry existed have a null expiry and stay valid.
export function isPortalTokenExpired(expiresAt: Date | null, now: Date): boolean {
  return expiresAt != null && expiresAt.getTime() < now.getTime();
}
