import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({ isStripeConfigured: vi.fn(), getStripe: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { POST } from "./route";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const stripeOn = vi.mocked(isStripeConfigured);
const findUnique = vi.mocked(prisma.submission.findUnique);

let ipCounter = 0;
function mkReq() {
  const ip = `10.1.0.${++ipCounter}`;
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
  } as never;
}
const ctx = { params: { token: "tok" } } as never;

beforeEach(() => vi.clearAllMocks());

describe("POST /api/pay/[token]/checkout — token expiry (H3)", () => {
  it("returns 410 for an expired link before creating a Stripe session", async () => {
    stripeOn.mockReturnValue(true);
    findUnique.mockResolvedValue({
      id: "s1",
      purchased: true,
      paymentStatus: "unpaid",
      annualPremium: 1000,
      policyType: "Vacant Home Insurance",
      applicantName: "Jane",
      contactEmail: "jane@example.com",
      createdAt: new Date(),
      paymentTokenExpiresAt: new Date(Date.now() - 60_000), // expired a minute ago
    } as never);

    const res = await POST(mkReq(), ctx);
    expect(res.status).toBe(410);
  });
});
