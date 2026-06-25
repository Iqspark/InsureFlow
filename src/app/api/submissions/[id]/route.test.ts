import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), delete: vi.fn() } },
}));

import { DELETE } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const del = vi.mocked(prisma.submission.delete);

const ctx = { params: Promise.resolve({ id: "s1" }) } as never;
const asAdmin = () => session.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);

beforeEach(() => {
  vi.clearAllMocks();
  del.mockResolvedValue({} as never);
});

describe("DELETE /api/submissions/[id]", () => {
  it("blocks deleting a quote under review (referred, not yet reviewed)", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "refer", reviewedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(del).not.toHaveBeenCalled();
  });

  it("blocks deleting a bound policy", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: true, decision: "accept", reviewedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(del).not.toHaveBeenCalled();
  });

  it("allows deleting a plain saved quote", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "accept", reviewedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("allows deleting a referral once it has been reviewed (resolved)", async () => {
    asAdmin();
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "refer", reviewedAt: new Date() } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalled();
  });

  it("returns 404 for an underwriter (not an owner/admin) — no delete authority", async () => {
    session.mockResolvedValue({ user: { id: "uw1", role: "UNDERWRITER" } } as never);
    findUnique.mockResolvedValue({ brokerId: "b1", purchased: false, decision: "accept", reviewedAt: null } as never);
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });
});
