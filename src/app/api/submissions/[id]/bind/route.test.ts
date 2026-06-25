import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/access", () => ({ canBindOrPay: vi.fn(() => true) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({
  sendPolicyIssuedEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: null }),
  sendUnderwriterNotificationEmail: vi.fn().mockResolvedValue({ sentTo: "uw@co.com" }),
}));
vi.mock("@/lib/policyDocument", () => ({ buildPolicyPdf: vi.fn().mockResolvedValue(Buffer.from("pdf")) }));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "https://app.example" }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendPolicyIssuedEmail } from "@/lib/email";
import { proposalDocumentHash } from "@/lib/proposal";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const updateMany = vi.mocked(prisma.submission.updateMany);
const sendIssued = vi.mocked(sendPolicyIssuedEmail);

let n = 0;
const ctx = () => ({ params: Promise.resolve({ id: `s${++n}` }) } as never);
const req = { headers: { get: () => null } } as never;

const facts = {
  policyType: "Vacant Home Insurance", applicantName: "Jane", province: "ON",
  decision: "accept", annualPremium: 1200, monthlyPremium: 110, coverageAmount: 500000, deductible: 2500,
};
const goodHash = proposalDocumentHash(facts);

const signedSub = {
  id: "s1", deletedAt: null, brokerId: "b1",
  purchased: false, paymentStatus: "unpaid", coverageStatus: "signed",
  contactEmail: "a@b.com", contactPhone: "555", ...facts,
  broker: { name: "Bob", email: "bob@co.com" },
  signatures: [{ documentHash: goodHash }],
};

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "b1", role: "BROKER", name: "Bob", email: "bob@co.com" } } as never);
  updateMany.mockResolvedValue({ count: 1 } as never);
});

describe("POST /api/submissions/[id]/bind", () => {
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null as never);
    expect((await POST(req, ctx())).status).toBe(401);
  });

  it("409 when the proposal is not signed", async () => {
    findUnique.mockResolvedValue({ ...signedSub, coverageStatus: "awaiting_signature" } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("409 when the quote changed since signing (hash mismatch)", async () => {
    findUnique.mockResolvedValue({ ...signedSub, signatures: [{ documentHash: "stale" }] } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("409 when already bound", async () => {
    findUnique.mockResolvedValue({ ...signedSub, purchased: true } as never);
    expect((await POST(req, ctx())).status).toBe(409);
  });

  it("binds a signed proposal: claims signed→bound, sets term + token, issues the policy", async () => {
    findUnique.mockResolvedValue(signedSub as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(200);

    const arg = updateMany.mock.calls[0]?.[0] as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(arg.where).toMatchObject({ id: "s1", coverageStatus: "signed", purchased: false });
    expect(arg.data.coverageStatus).toBe("bound");
    expect(arg.data.purchased).toBe(true);
    expect(typeof arg.data.paymentToken).toBe("string");
    expect(arg.data.effectiveAt).toBeInstanceOf(Date);
    expect(arg.data.policyIssuedAt).toBeInstanceOf(Date);

    expect(sendIssued).toHaveBeenCalledOnce();
    const email = sendIssued.mock.calls[0]?.[0] as { payUrl: string; pdf?: unknown };
    expect(email.payUrl).toContain("/pay/");
    expect(email.pdf).toBeTruthy();
  });

  it("409 when the atomic claim is lost (concurrent bind)", async () => {
    findUnique.mockResolvedValue(signedSub as never);
    updateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
    expect(sendIssued).not.toHaveBeenCalled();
  });
});
