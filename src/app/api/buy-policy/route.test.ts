import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/access", () => ({ canBindOrPay: vi.fn(() => true) }));
vi.mock("@/lib/email", () => ({
  sendPaymentRequestEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: null }),
}));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);

function mkReq(body: unknown) {
  return { json: async () => body, headers: { get: () => null } } as never;
}

const boundUnpaid = {
  id: "s1", deletedAt: null, brokerId: "b1", purchased: true, paymentStatus: "unpaid",
  contactEmail: "a@b.com", applicantName: "Jane", policyType: "Vacant Home Insurance",
  annualPremium: 1200, paymentToken: "tok", policyIssuedAt: new Date(), effectiveAt: new Date(),
  dueAt: new Date(Date.now() + 30 * 86_400_000), broker: { name: "Bob" },
};

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "b1", name: "Bob", email: "bob@co.com", role: "BROKER" } } as never);
  update.mockResolvedValue({} as never);
});

describe("POST /api/buy-policy (resend-only)", () => {
  it("resends the pay link on a bound, unpaid policy and refreshes the expiry", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(200);
    const data = update.mock.calls[0][0].data as { paymentToken: string; paymentTokenExpiresAt: Date };
    expect(data.paymentToken).toBe("tok");
    expect(data.paymentTokenExpiresAt).toBeInstanceOf(Date);
  });

  it("409 when the policy isn't bound yet (binding requires the signed flow)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, purchased: false } as never);
    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("409 when the policy is already paid", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, paymentStatus: "paid" } as never);
    const res = await POST(mkReq({ submissionId: "s1" }));
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });
});
