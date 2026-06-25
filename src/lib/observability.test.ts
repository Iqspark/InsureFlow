import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const ORIG = process.env.SENTRY_DSN;

describe("captureError", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = ORIG;
  });

  it("logs to console and skips Sentry when no DSN is configured", async () => {
    delete process.env.SENTRY_DSN;
    const Sentry = await import("@sentry/nextjs");
    const { captureError, isObservabilityConfigured } = await import("./observability");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(isObservabilityConfigured()).toBe(false);
    expect(() => captureError(new Error("x"), { area: "payment" })).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("sends to Sentry tagged by area when DSN is set", async () => {
    process.env.SENTRY_DSN = "https://abc@o0.ingest.sentry.io/0";
    const Sentry = await import("@sentry/nextjs");
    const { captureError, isObservabilityConfigured } = await import("./observability");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");

    expect(isObservabilityConfigured()).toBe(true);
    captureError(err, { area: "webhook", message: "processing error", extra: { eventId: "evt_1" } });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { area: "webhook" },
      extra: { message: "processing error", eventId: "evt_1" },
    });
    spy.mockRestore();
  });
});
