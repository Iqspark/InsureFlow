import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { create: vi.fn(), updateMany: vi.fn() } },
}));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const session = vi.mocked(getServerSession);
const create = vi.mocked(prisma.submission.create);
const updateMany = vi.mocked(prisma.submission.updateMany);

const body = { answers: { applicant_name: { questionId: "applicant_name", value: "X", displayValue: "X" } } };
function mkReq(b: unknown) {
  return { json: async () => b } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "broker1", role: "BROKER", name: "B" } } as never);
});

describe("POST /api/drafts — auth + scoping (C2)", () => {
  it("rejects unauthenticated draft writes with 401", async () => {
    session.mockResolvedValue(null as never);
    const res = await POST(mkReq(body));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("scopes draftId updates to the caller's own draft (404 otherwise)", async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST(mkReq({ ...body, draftId: "someone-elses-id" }));
    expect(res.status).toBe(404);
    const where = (updateMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where;
    expect(where).toMatchObject({ id: "someone-elses-id", brokerId: "broker1", status: "draft" });
  });

  it("creates a new draft owned by the session broker when no draftId is given", async () => {
    create.mockResolvedValue({ id: "d-new" } as never);
    const res = await POST(mkReq(body));
    expect(res.status).toBe(200);
    const data = (create.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.brokerId).toBe("broker1");
  });
});
