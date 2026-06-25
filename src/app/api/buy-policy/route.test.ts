import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/access", () => ({ canBindOrPay: vi.fn(() => true) }));
vi.mock("@/lib/email", () => ({
  sendPaymentRequestEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: null }),
  sendUnderwriterNotificationEmail: vi.fn().mockResolvedValue({ sentTo: "uw@co.com" }),
}));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { PORTAL_TOKEN_TTL_DAYS } from "@/lib/portalToken";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);

function mkReq(body: unknown) {
  return { json: async () => body, headers: { get: () => null } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "b1", name: "Broker Bob", email: "bob@co.com", role: "BROKER" } } as never);
  update.mockResolvedValue({} as never);
});

describe("POST /api/buy-policy", () => {
  it("binds an accepted quote and issues a pay/portal token WITH an expiry", async () => {
    findUnique.mockResolvedValue({
      id: "s1", decision: "accept", paymentStatus: "unpaid", purchased: false,
      contactEmail: "a@b.com", applicantName: "Jane", policyType: "Vacant Home Insurance",
      annualPremium: 1200, broker: { name: "Broker Bob", email: "bob@co.com" },
      paymentToken: null, effectiveAt: null,
    } as never);

    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(200);

    const data = update.mock.calls[0][0].data as { purchased: boolean; paymentToken: string; paymentTokenExpiresAt: Date };
    expect(data.purchased).toBe(true);
    expect(typeof data.paymentToken).toBe("string");
    expect(data.paymentTokenExpiresAt).toBeInstanceOf(Date);

    const days = Math.round((data.paymentTokenExpiresAt.getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(PORTAL_TOKEN_TTL_DAYS);
  });

  it("refuses to bind a non-accepted quote", async () => {
    findUnique.mockResolvedValue({
      id: "s1", decision: "refer", paymentStatus: "unpaid", purchased: false, contactEmail: "a@b.com",
    } as never);
    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 409 when the policy is already paid", async () => {
    findUnique.mockResolvedValue({
      id: "s1", decision: "accept", paymentStatus: "paid", purchased: true, contactEmail: "a@b.com",
    } as never);
    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });
});
