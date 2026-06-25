import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({ isStripeConfigured: vi.fn(), getStripe: vi.fn() }));
vi.mock("@/lib/finalizePayment", () => ({ finalizePaidPolicy: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ tooMany: vi.fn(() => null), clientIp: vi.fn(() => "ip") }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: { create: vi.fn(), delete: vi.fn() },
    submission: { findUnique: vi.fn() },
  },
}));

import { POST } from "./route";
import { isStripeConfigured, getStripe } from "@/lib/stripe";
import { finalizePaidPolicy } from "@/lib/finalizePayment";
import { prisma } from "@/lib/prisma";

const stripeOn = vi.mocked(isStripeConfigured);
const getStripeMock = vi.mocked(getStripe);
const finalize = vi.mocked(finalizePaidPolicy);
const evtCreate = vi.mocked(prisma.webhookEvent.create);
const evtDelete = vi.mocked(prisma.webhookEvent.delete);
const findUnique = vi.mocked(prisma.submission.findUnique);

function mkReq(body: string, sig = "sig") {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "stripe-signature" ? sig : null) },
    text: async () => body,
  } as never;
}

// Wires getStripe().webhooks.constructEvent to return `event` (or throw).
function stubEvent(event: unknown, opts: { throws?: boolean } = {}) {
  const constructEvent = vi.fn(() => {
    if (opts.throws) throw new Error("bad signature");
    return event;
  });
  getStripeMock.mockReturnValue({ webhooks: { constructEvent } } as never);
  return constructEvent;
}

const paidEvent = (over: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  data: { object: { metadata: { submissionId: "s1" }, payment_intent: "pi_1", payment_status: "paid", amount_total: 120000, ...over } },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  stripeOn.mockReturnValue(true);
  evtCreate.mockResolvedValue({} as never);
  evtDelete.mockResolvedValue({} as never);
  finalize.mockResolvedValue({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: null } as never);
  findUnique.mockResolvedValue({ annualPremium: 1200 } as never);
});

describe("POST /api/stripe/webhook", () => {
  it("returns 503 when Stripe is not configured", async () => {
    stripeOn.mockReturnValue(false);
    const res = await POST(mkReq("{}"));
    expect(res.status).toBe(503);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("returns 400 on signature verification failure", async () => {
    stubEvent(null, { throws: true });
    const res = await POST(mkReq("{}"));
    expect(res.status).toBe(400);
    expect(evtCreate).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("dedups a redelivered event (unique-constraint) without reprocessing", async () => {
    stubEvent(paidEvent());
    evtCreate.mockRejectedValue(new Error("unique violation"));
    const res = await POST(mkReq("{}"));
    const json = await res.json();
    expect(json).toEqual({ received: true, duplicate: true });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("finalizes a completed paid session", async () => {
    stubEvent(paidEvent());
    const res = await POST(mkReq("{}"));
    expect(res.status).toBe(200);
    expect(finalize).toHaveBeenCalledWith("s1", { stripePaymentIntentId: "pi_1", stripeStatus: "paid", paidAmount: 1200 });
  });

  it("does not finalize when payment_status is not paid", async () => {
    stubEvent(paidEvent({ payment_status: "unpaid" }));
    await POST(mkReq("{}"));
    expect(finalize).not.toHaveBeenCalled();
  });

  it("flags an amount mismatch but still finalizes the confirmed payment", async () => {
    findUnique.mockResolvedValue({ annualPremium: 1200 } as never); // expects 120000¢
    stubEvent(paidEvent({ amount_total: 999 }));
    await POST(mkReq("{}"));
    expect(finalize).toHaveBeenCalledWith("s1", { stripePaymentIntentId: "pi_1", stripeStatus: "paid_amount_mismatch", paidAmount: 9.99 });
  });

  it("releases the dedup claim and 500s when finalize throws (so Stripe retries)", async () => {
    stubEvent(paidEvent());
    finalize.mockRejectedValue(new Error("db down"));
    const res = await POST(mkReq("{}"));
    expect(res.status).toBe(500);
    expect(evtDelete).toHaveBeenCalledWith({ where: { id: "evt_1" } });
  });
});
