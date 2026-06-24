import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({
  sendPolicyConfirmationEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com" }),
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: "http://preview" }),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));

import { finalizePaidPolicy } from "./finalizePayment";
import { prisma } from "@/lib/prisma";
import { sendPolicyConfirmationEmail, sendPaymentReceiptEmail } from "@/lib/email";

const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);

const boundUnpaid = {
  id: "s1",
  purchased: true,
  paymentStatus: "unpaid",
  annualPremium: 1200,
  monthlyPremium: 110,
  coverageAmount: 500000,
  deductible: 1000,
  province: "ON",
  applicantName: "Jane",
  policyType: "Vacant Home Insurance",
  contactEmail: "a@b.com",
  broker: { name: "Broker Bob", email: "bob@brokerage.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({} as never);
});

describe("finalizePaidPolicy", () => {
  it("returns not_found when the submission is missing", async () => {
    findUnique.mockResolvedValue(null as never);
    const r = await finalizePaidPolicy("missing");
    expect(r).toEqual({ ok: false, reason: "not_found" });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns not_bound when the policy isn't purchased", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, purchased: false } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toEqual({ ok: false, reason: "not_bound" });
    expect(update).not.toHaveBeenCalled();
  });

  it("is idempotent — already paid is a no-op (no update, no email)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, paymentStatus: "paid" } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toEqual({ ok: true, alreadyPaid: true, amount: 1200, previewUrl: null });
    expect(update).not.toHaveBeenCalled();
    expect(sendPolicyConfirmationEmail).not.toHaveBeenCalled();
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("marks an unpaid bound policy paid and emails confirmation + receipt", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    const r = await finalizePaidPolicy("s1", { stripePaymentIntentId: "pi_1", stripeStatus: "paid" });
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: "http://preview" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({ paymentStatus: "paid", paidAmount: 1200, stripePaymentIntentId: "pi_1", stripeStatus: "paid" }),
      })
    );
    expect(sendPolicyConfirmationEmail).toHaveBeenCalledOnce();
    expect(sendPaymentReceiptEmail).toHaveBeenCalledOnce();
  });

  it("still marks paid when there is no contact email (skips sending)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, contactEmail: null } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toMatchObject({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: null });
    expect(update).toHaveBeenCalledOnce();
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });
});
