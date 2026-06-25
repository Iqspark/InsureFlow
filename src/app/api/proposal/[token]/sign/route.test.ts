import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);

let ipN = 0;
function mkReq(body: unknown) {
  const ip = `10.5.0.${++ipN}`;
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : k.toLowerCase() === "user-agent" ? "vitest" : null) },
    json: async () => body,
  } as never;
}
const ctx = { params: Promise.resolve({ token: "tok" }) } as never;

const awaiting = {
  id: "s1", deletedAt: null, coverageStatus: "awaiting_signature",
  proposalTokenExpiresAt: new Date(Date.now() + 86_400_000),
  policyType: "Vacant Home Insurance", applicantName: "Jane", province: "ON",
  decision: "accept", annualPremium: 1200, monthlyPremium: 110, coverageAmount: 500000, deductible: 2500,
};

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({} as never);
});

describe("POST /api/proposal/[token]/sign", () => {
  it("400 without a typed name", async () => {
    findUnique.mockResolvedValue(awaiting as never);
    const res = await POST(mkReq({ signerName: "", consent: true }), ctx);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400 without consent", async () => {
    findUnique.mockResolvedValue(awaiting as never);
    const res = await POST(mkReq({ signerName: "Jane Doe", consent: false }), ctx);
    expect(res.status).toBe(400);
  });

  it("404 for an unknown token", async () => {
    findUnique.mockResolvedValue(null as never);
    const res = await POST(mkReq({ signerName: "Jane Doe", consent: true }), ctx);
    expect(res.status).toBe(404);
  });

  it("410 for an expired proposal link", async () => {
    findUnique.mockResolvedValue({ ...awaiting, proposalTokenExpiresAt: new Date(Date.now() - 1000) } as never);
    const res = await POST(mkReq({ signerName: "Jane Doe", consent: true }), ctx);
    expect(res.status).toBe(410);
  });

  it("409 when already signed", async () => {
    findUnique.mockResolvedValue({ ...awaiting, coverageStatus: "signed" } as never);
    const res = await POST(mkReq({ signerName: "Jane Doe", consent: true }), ctx);
    expect(res.status).toBe(409);
  });

  it("records the signature + evidence and moves to signed", async () => {
    findUnique.mockResolvedValue(awaiting as never);
    const res = await POST(mkReq({ signerName: "Jane Doe", consent: true }), ctx);
    expect(res.status).toBe(200);
    const data = (update.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.coverageStatus).toBe("signed");
    expect(data.signedAt).toBeInstanceOf(Date);
    const sig = (data.signatures as { create: Record<string, unknown> }).create;
    expect(sig.signerName).toBe("Jane Doe");
    expect(sig.method).toBe("typed");
    expect(sig.documentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sig.ip).toBeTruthy();
    expect(sig.userAgent).toBe("vitest");
  });
});
