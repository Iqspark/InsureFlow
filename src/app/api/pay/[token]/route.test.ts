import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({ isStripeConfigured: vi.fn() }));
vi.mock("@/lib/finalizePayment", () => ({ finalizePaidPolicy: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn() } },
}));

import { POST } from "./route";
import { isStripeConfigured } from "@/lib/stripe";
import { finalizePaidPolicy } from "@/lib/finalizePayment";
import { prisma } from "@/lib/prisma";

const stripeOn = vi.mocked(isStripeConfigured);
const finalize = vi.mocked(finalizePaidPolicy);
const findUnique = vi.mocked(prisma.submission.findUnique);

// Each test uses a distinct IP so the shared rate-limit window never trips.
let ipCounter = 0;
function mkReq(body: unknown) {
  const ip = `10.0.0.${++ipCounter}`;
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
    json: async () => body,
  } as never;
}
const ctx = { params: { token: "tok" } } as never;

beforeEach(() => vi.clearAllMocks());

describe("POST /api/pay/[token] (simulated fallback)", () => {
  it("is disabled (400) when Stripe is configured — no payment bypass", async () => {
    stripeOn.mockReturnValue(true);
    const res = await POST(mkReq({ cardNumber: "4242424242424242", expiry: "12/30", cvc: "123" }), ctx);
    expect(res.status).toBe(400);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("rejects a malformed card when Stripe is off", async () => {
    stripeOn.mockReturnValue(false);
    const res = await POST(mkReq({ cardNumber: "123", expiry: "13/99", cvc: "x" }), ctx);
    expect(res.status).toBe(400);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("finalizes a valid simulated payment when Stripe is off", async () => {
    stripeOn.mockReturnValue(false);
    findUnique.mockResolvedValue({ id: "s1", purchased: true, paymentStatus: "unpaid" } as never);
    finalize.mockResolvedValue({ ok: true, alreadyPaid: false, amount: 1000, previewUrl: null } as never);
    const res = await POST(mkReq({ cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" }), ctx);
    expect(res.status).toBe(200);
    expect(finalize).toHaveBeenCalledWith("s1");
  });

  it("returns 409 when the policy is already paid", async () => {
    stripeOn.mockReturnValue(false);
    findUnique.mockResolvedValue({ id: "s1", purchased: true, paymentStatus: "paid" } as never);
    const res = await POST(mkReq({ cardNumber: "4242424242424242", expiry: "12/30", cvc: "123" }), ctx);
    expect(res.status).toBe(409);
    expect(finalize).not.toHaveBeenCalled();
  });
});
