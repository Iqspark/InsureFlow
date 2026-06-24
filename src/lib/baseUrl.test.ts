import { describe, it, expect, afterEach } from "vitest";
import { publicBaseUrl } from "./baseUrl";
import type { NextRequest } from "next/server";

const originalEnv = process.env.NEXTAUTH_URL;
afterEach(() => {
  process.env.NEXTAUTH_URL = originalEnv;
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
});
