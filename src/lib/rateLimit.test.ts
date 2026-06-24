import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, clientIp, tooMany } from "./rateLimit";

afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = "test-block";
    expect(rateLimit(key, 3, 1000).ok).toBe(true);
    expect(rateLimit(key, 3, 1000).ok).toBe(true);
    expect(rateLimit(key, 3, 1000).ok).toBe(true);
    const fourth = rateLimit(key, 3, 1000);
    expect(fourth.ok).toBe(false);
    expect(fourth.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = "test-reset";
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
  });

  it("tracks each key independently", () => {
    expect(rateLimit("key-a", 1, 1000).ok).toBe(true);
    expect(rateLimit("key-b", 1, 1000).ok).toBe(true); // different key, fresh window
  });
});

describe("clientIp", () => {
  const mk = (headers: Record<string, string>) =>
    ({ headers: { get: (k: string) => headers[k] ?? null } }) as unknown as Request;

  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(mk({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
  });
  it("falls back to x-real-ip", () => {
    expect(clientIp(mk({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
  });
  it("returns 'unknown' when no headers", () => {
    expect(clientIp(mk({}))).toBe("unknown");
  });
});

describe("tooMany", () => {
  it("returns null while under the limit", () => {
    expect(tooMany("tm-ok", 5, 1000)).toBeNull();
  });
  it("returns a 429 Response once over the limit", () => {
    tooMany("tm-block", 1, 1000);
    const res = tooMany("tm-block", 1, 1000);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBeTruthy();
  });
});
