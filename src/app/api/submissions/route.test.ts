import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { create: vi.fn(), updateMany: vi.fn() } },
}));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/engine/quoteCalculator";
import type { Answer } from "@/types";

const session = vi.mocked(getServerSession);
const create = vi.mocked(prisma.submission.create);
const updateMany = vi.mocked(prisma.submission.updateMany);

const a = (questionId: string, value: string | number, displayValue = String(value)): Answer => ({
  questionId,
  value,
  displayValue,
});

// A realistic vacant-home answer set so the server-side recompute is deterministic.
const answers: Record<string, Answer> = {
  property_province: a("property_province", "ON", "Ontario"),
  property_value: a("property_value", 500_000, "$500,000"),
  coverage_amount: a("coverage_amount", "100", "100%"),
  deductible: a("deductible", 2500, "$2,500"),
  vacancy_duration: a("vacancy_duration", "0-6m", "0–6 months"),
  applicant_name: a("applicant_name", "Jane Doe"),
};

function mkReq(body: unknown) {
  return { json: async () => body } as never;
}

function lastData(mock: typeof create | typeof updateMany) {
  const arg = mock.mock.calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
  return arg?.data ?? {};
}

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "broker1", role: "BROKER", name: "B" } } as never);
});

describe("POST /api/submissions — auth + premium integrity (C1)", () => {
  it("rejects an unauthenticated request with 401 and writes nothing", async () => {
    session.mockResolvedValue(null as never);
    const res = await POST(mkReq({ answers, quoteDetails: { decision: "accept", finalAnnualPremium: 1 } }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("ignores client-forged decision/premium and stores the server-recomputed values", async () => {
    create.mockResolvedValue({ id: "new1" } as never);
    const expected = calculateQuote(answers);

    // Client forges an accepted $1 policy for $9M of coverage.
    const res = await POST(
      mkReq({
        answers,
        quoteDetails: { decision: "accept", finalAnnualPremium: 1, finalMonthlyPremium: 1, coverageAmount: 9_000_000 },
        policyType: "Vacant Home Insurance",
      })
    );

    expect(res.status).toBe(201);
    const data = lastData(create);
    expect(data.decision).toBe(expected.decision);
    expect(data.annualPremium).toBe(expected.finalAnnualPremium);
    expect(data.coverageAmount).toBe(expected.coverageAmount);
    // The forged values did not survive.
    expect(data.annualPremium).not.toBe(1);
    expect(data.coverageAmount).not.toBe(9_000_000);
    // brokerId always comes from the session, never the body.
    expect(data.brokerId).toBe("broker1");
  });
});

describe("POST /api/submissions — draft promotion scoping (C2)", () => {
  it("404s when the draftId is not the caller's own draft, and never falls back to create", async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST(mkReq({ answers, draftId: "victims-submission-id" }));
    expect(res.status).toBe(404);
    const where = (updateMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where;
    expect(where).toMatchObject({ id: "victims-submission-id", brokerId: "broker1", status: "draft" });
    expect(create).not.toHaveBeenCalled();
  });

  it("promotes the caller's own draft", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    const res = await POST(mkReq({ answers, draftId: "my-draft" }));
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("my-draft");
  });
});
