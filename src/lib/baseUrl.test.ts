import { describe, it, expect, afterEach } from "vitest";
import { publicBaseUrl } from "./baseUrl";
import type { NextRequest } from "next/server";

const originalEnv = process.env.NEXTAUTH_URL;
const originalAllow = process.env.PUBLIC_HOST_ALLOWLIST;
afterEach(() => {
  process.env.NEXTAUTH_URL = originalEnv;
  if (originalAllow === undefined) delete process.env.PUBLIC_HOST_ALLOWLIST;
  else process.env.PUBLIC_HOST_ALLOWLIST = originalAllow;
});

function mkReq(headers: Record<string, string>, nextUrl: { protocol: string; origin: string }): NextRequest {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    nextUrl,
  } as unknown as NextRequest;
}

const internal = { protocol: "http:", origin: "http://internal:8080" };

describe("publicBaseUrl", () => {
  it("uses an explicit non-localhost NEXTAUTH_URL and strips trailing slash", () => {
    process.env.NEXTAUTH_URL = "https://prod.example.com/";
    expect(publicBaseUrl(mkReq({}, internal))).toBe("https://prod.example.com");
  });

  it("ignores a localhost NEXTAUTH_URL and uses x-forwarded-host + proto", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    const req = mkReq(
      { "x-forwarded-host": "app.azurewebsites.net", "x-forwarded-proto": "https" },
      internal
    );
    expect(publicBaseUrl(req)).toBe("https://app.azurewebsites.net");
  });

  it("falls back to the preserved Host header (Azure) with forwarded proto", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    const req = mkReq({ host: "app.azurewebsites.net", "x-forwarded-proto": "https" }, internal);
    expect(publicBaseUrl(req)).toBe("https://app.azurewebsites.net");
  });

  it("falls back to the request origin when nothing public is available", () => {
    delete process.env.NEXTAUTH_URL;
    expect(publicBaseUrl(mkReq({}, internal))).toBe("http://internal:8080");
  });

  it("rejects a forged x-forwarded-host that is not in PUBLIC_HOST_ALLOWLIST", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.PUBLIC_HOST_ALLOWLIST = "app.azurewebsites.net";
    const req = mkReq(
      { "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https" },
      internal
    );
    // Falls through to the (localhost) configured value rather than trusting the spoofed host.
    expect(publicBaseUrl(req)).toBe("http://localhost:3000");
  });

  it("accepts an allowlisted x-forwarded-host", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.PUBLIC_HOST_ALLOWLIST = "app.azurewebsites.net";
    const req = mkReq(
      { "x-forwarded-host": "app.azurewebsites.net", "x-forwarded-proto": "https" },
      internal
    );
    expect(publicBaseUrl(req)).toBe("https://app.azurewebsites.net");
  });
});
