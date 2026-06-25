import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const session = vi.mocked(getServerSession);

function stubEmptyData() {
  vi.mocked(prisma.submission.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.submission.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.submission.aggregate).mockResolvedValue({
    _avg: { annualPremium: null },
    _min: { annualPremium: null },
    _max: { annualPremium: null },
    _count: { annualPremium: 0 },
  } as never);
  vi.mocked(prisma.submission.findMany).mockResolvedValue([] as never);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/analytics — access control (H1)", () => {
  it("401 for an anonymous request and never queries data", async () => {
    session.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prisma.submission.count).not.toHaveBeenCalled();
  });

  it("403 for a non-admin (broker) session", async () => {
    session.mockResolvedValue({ user: { id: "b1", role: "BROKER" } } as never);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(prisma.submission.count).not.toHaveBeenCalled();
  });

  it("403 for an underwriter session (cross-broker data is admin-only)", async () => {
    session.mockResolvedValue({ user: { id: "u1", role: "UNDERWRITER" } } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("200 for an admin session", async () => {
    session.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    stubEmptyData();
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
