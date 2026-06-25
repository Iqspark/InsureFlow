import { describe, it, expect } from "vitest";
import { isPortalTokenExpired, portalTokenExpiry, PORTAL_TOKEN_TTL_DAYS } from "./portalToken";

describe("portalToken", () => {
  const now = new Date("2026-06-24T00:00:00Z");

  it("treats a null expiry (legacy token) as not expired", () => {
    expect(isPortalTokenExpired(null, now)).toBe(false);
  });

  it("is expired when the expiry is in the past", () => {
    expect(isPortalTokenExpired(new Date("2026-06-23T23:59:59Z"), now)).toBe(true);
  });

  it("is not expired when the expiry is in the future", () => {
    expect(isPortalTokenExpired(new Date("2026-06-25T00:00:00Z"), now)).toBe(false);
  });

  it("portalTokenExpiry adds the TTL window", () => {
    const exp = portalTokenExpiry(now);
    const days = (exp.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBe(PORTAL_TOKEN_TTL_DAYS);
    expect(isPortalTokenExpired(exp, now)).toBe(false);
  });
});
