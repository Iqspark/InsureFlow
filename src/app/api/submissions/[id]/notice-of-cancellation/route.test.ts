import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/access", () => ({ canBindOrPay: vi.fn(() => true) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({ sendNoticeOfCancellationEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com", previewUrl: null }) }));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "https://app.example" }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const updateMany = vi.mocked(prisma.submission.updateMany);

let n = 0;
const ctx = () => ({ params: Promise.resolve({ id: `s${++n}` }) } as never);
const req = { headers: { get: () => null } } as never;
const DAY = 86_400_000;

const pastDue = {
  id: "s1", deletedAt: null, brokerId: "b1", coverageStatus: "bound", paymentStatus: "unpaid",
  contactEmail: "a@b.com", applicantName: "Jane", policyType: "Vacant Home Insurance",
  annualPremium: 1200, paymentToken: "tok", dueAt: new Date(Date.now() - 8 * DAY), // past due by > grace(7)
  broker: { name: "Bob" },
};

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "b1", role: "BROKER", name: "Bob" } } as never);
  updateMany.mockResolvedValue({ count: 1 } as never);
});

describe("POST /api/submissions/[id]/notice-of-cancellation", () => {
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null as never);
    expect((await POST(req, ctx())).status).toBe(401);
  });

  it("409 when the policy isn't in force (not bound)", async () => {
    findUnique.mockResolvedValue({ ...pastDue, coverageStatus: "signed" } as never);
    expect((await POST(req, ctx())).status).toBe(409);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("400 when not yet past due by the grace period", async () => {
    findUnique.mockResolvedValue({ ...pastDue, dueAt: new Date(Date.now() + 5 * DAY) } as never);
    expect((await POST(req, ctx())).status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("issues the notice: sets pending_cancellation + an effective date", async () => {
    findUnique.mockResolvedValue(pastDue as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(200);
    const arg = updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(arg.data.coverageStatus).toBe("pending_cancellation");
    expect(arg.data.cancellationEffectiveAt).toBeInstanceOf(Date);
  });
});
