import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({
  sendPolicyConfirmationEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com" }),
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: "http://preview" }),
  sendReinstatementEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com" }),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/policyDocument", () => ({
  buildPolicyPdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
}));

import { finalizePaidPolicy } from "./finalizePayment";
import { prisma } from "@/lib/prisma";
import { sendPolicyConfirmationEmail, sendPaymentReceiptEmail, sendReinstatementEmail } from "@/lib/email";

const findUnique = vi.mocked(prisma.submission.findUnique);
const updateMany = vi.mocked(prisma.submission.updateMany);
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
  updateMany.mockResolvedValue({ count: 1 } as never);
  update.mockResolvedValue({} as never);
});

describe("finalizePaidPolicy", () => {
  it("returns not_found when the submission is missing", async () => {
    findUnique.mockResolvedValue(null as never);
    const r = await finalizePaidPolicy("missing");
    expect(r).toEqual({ ok: false, reason: "not_found" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns not_bound when the policy isn't purchased", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, purchased: false } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toEqual({ ok: false, reason: "not_bound" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent — already paid is a no-op (no update, no email)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, paymentStatus: "paid" } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toEqual({ ok: true, alreadyPaid: true, amount: 1200, previewUrl: null });
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendPolicyConfirmationEmail).not.toHaveBeenCalled();
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("marks an unpaid bound policy paid and emails confirmation + receipt", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    const r = await finalizePaidPolicy("s1", { stripePaymentIntentId: "pi_1", stripeStatus: "paid" });
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: "http://preview" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1", paymentStatus: { not: "paid" } },
        data: expect.objectContaining({ paymentStatus: "paid", paidAmount: 1200, stripePaymentIntentId: "pi_1", stripeStatus: "paid" }),
      })
    );
    expect(sendPolicyConfirmationEmail).toHaveBeenCalledOnce();
    expect(sendPaymentReceiptEmail).toHaveBeenCalledOnce();
    expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        pdf: expect.objectContaining({ filename: expect.stringContaining(".pdf") }),
      })
    );
  });

  it("treats a lost atomic claim (concurrent finalizer) as already paid — no duplicate emails", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    updateMany.mockResolvedValue({ count: 0 } as never); // another finalizer won the race
    const r = await finalizePaidPolicy("s1");
    expect(r).toEqual({ ok: true, alreadyPaid: true, amount: 1200, previewUrl: null });
    expect(sendPolicyConfirmationEmail).not.toHaveBeenCalled();
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("still marks paid when there is no contact email (skips sending)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, contactEmail: null } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r).toMatchObject({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: null });
    expect(updateMany).toHaveBeenCalledOnce();
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("sends a receipt only (no policy confirmation) when the policy was issued at bind (Phase C)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, policyIssuedAt: new Date() } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r.ok).toBe(true);
    expect(sendPolicyConfirmationEmail).not.toHaveBeenCalled();
    expect(sendPaymentReceiptEmail).toHaveBeenCalledOnce();
  });

  it("records an offline payment with its method + reference (broker actor)", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    const r = await finalizePaidPolicy("s1", { method: "cheque", reference: "CHQ-1001", recordedByName: "Bob", recordedByRole: "BROKER" });
    expect(r.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "paid", paymentMethod: "cheque", paymentReference: "CHQ-1001" }),
      })
    );
  });

  it("defaults the method to online_card for the customer online path", async () => {
    findUnique.mockResolvedValue(boundUnpaid as never);
    await finalizePaidPolicy("s1");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentMethod: "online_card" }) })
    );
  });

  it("reinstates a pending_cancellation policy on payment within the notice window (Phase D)", async () => {
    findUnique.mockResolvedValue({ ...boundUnpaid, policyIssuedAt: new Date(), coverageStatus: "pending_cancellation" } as never);
    const r = await finalizePaidPolicy("s1");
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ coverageStatus: "bound", cancellationNoticeAt: null, cancellationEffectiveAt: null }),
      })
    );
    expect(sendReinstatementEmail).toHaveBeenCalledOnce();
  });
});
