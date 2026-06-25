import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));

import { DELETE } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);
const audit = vi.mocked(recordAudit);

const ctx = { params: Promise.resolve({ id: "s1" }) } as never;
const asAdmin = () => session.mockResolvedValue({ user: { id: "a1", name: "Admin", role: "ADMIN" } } as never);

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({} as never);
});

describe("DELETE /api/submissions/[id]", () => {
  it("blocks deleting a quote under review (referred, not yet reviewed)", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "refer", reviewedAt: null, deletedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks deleting a bound policy", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: true, decision: "accept", reviewedAt: null, deletedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("soft-deletes a plain saved quote and records a 'deleted' audit event", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "accept", reviewedAt: null, deletedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "s1" },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "deleted", submissionId: "s1" }));
  });

  it("allows deleting a referral once it has been reviewed (resolved)", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "refer", reviewedAt: new Date(), deletedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("returns 404 for an already soft-deleted quote", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "accept", reviewedAt: null, deletedAt: new Date() } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 for an underwriter (not an owner/admin) — no delete authority", async () => {
    session.mockResolvedValue({ user: { id: "uw1", name: "UW", role: "UNDERWRITER" } } as never);
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "accept", reviewedAt: null, deletedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
