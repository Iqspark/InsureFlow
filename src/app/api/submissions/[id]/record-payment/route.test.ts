import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/access", () => ({ canBindOrPay: vi.fn(() => true) }));
vi.mock("@/lib/prisma", () => ({ prisma: { submission: { findUnique: vi.fn() } } }));
vi.mock("@/lib/finalizePayment", () => ({ finalizePaidPolicy: vi.fn() }));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { finalizePaidPolicy } from "@/lib/finalizePayment";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const finalize = vi.mocked(finalizePaidPolicy);

let n = 0;
const ctx = () => ({ params: Promise.resolve({ id: `s${++n}` }) } as never);
function mkReq(body: unknown) {
  return { json: async () => body, headers: { get: () => null } } as never;
}

const bound = { id: "s1", brokerId: "b1", deletedAt: null, purchased: true, paymentStatus: "unpaid" };

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "b1", role: "BROKER", name: "Bob" } } as never);
  findUnique.mockResolvedValue(bound as never);
  finalize.mockResolvedValue({ ok: true, alreadyPaid: false, amount: 1200, previewUrl: null } as never);
});

describe("POST /api/submissions/[id]/record-payment", () => {
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null as never);
    expect((await POST(mkReq({ method: "cash" }), ctx())).status).toBe(401);
  });

  it("400 for an invalid / online method", async () => {
    expect((await POST(mkReq({ method: "online_card" }), ctx())).status).toBe(400);
    expect((await POST(mkReq({ method: "bogus" }), ctx())).status).toBe(400);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("409 when the policy isn't bound yet", async () => {
    findUnique.mockResolvedValue({ ...bound, purchased: false } as never);
    expect((await POST(mkReq({ method: "cash" }), ctx())).status).toBe(409);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("409 when already paid", async () => {
    findUnique.mockResolvedValue({ ...bound, paymentStatus: "paid" } as never);
    expect((await POST(mkReq({ method: "cash" }), ctx())).status).toBe(409);
  });

  it("records the payment via finalizePaidPolicy with method + broker actor", async () => {
    const res = await POST(mkReq({ method: "cheque", amount: 1200, reference: "CHQ-1" }), ctx());
    expect(res.status).toBe(200);
    expect(finalize).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ method: "cheque", reference: "CHQ-1", recordedByName: "Bob", recordedByRole: "BROKER", paidAmount: 1200 }),
    );
  });
});
