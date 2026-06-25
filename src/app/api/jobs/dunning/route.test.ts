import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({
  sendPaymentReminderEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com" }),
  sendCancellationEmail: vi.fn().mockResolvedValue({ sentTo: "a@b.com" }),
}));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "https://app.example" }));
vi.mock("@/utils/policyNumber", () => ({ policyNumber: () => "APP-1" }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { sendPaymentReminderEmail, sendCancellationEmail } from "@/lib/email";

const findMany = vi.mocked(prisma.submission.findMany);
const update = vi.mocked(prisma.submission.update);
const updateMany = vi.mocked(prisma.submission.updateMany);
const reminder = vi.mocked(sendPaymentReminderEmail);
const cancel = vi.mocked(sendCancellationEmail);

const DAY = 86_400_000;
function mkReq(secret: string | null) {
  return { headers: { get: (k: string) => (k.toLowerCase() === "x-jobs-secret" ? secret : null) } } as never;
}

const savedSecret = process.env.JOBS_SECRET;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.JOBS_SECRET = "s3cret";
  findMany.mockResolvedValue([] as never);
  update.mockResolvedValue({} as never);
  updateMany.mockResolvedValue({ count: 1 } as never);
});
afterEach(() => {
  if (savedSecret === undefined) delete process.env.JOBS_SECRET;
  else process.env.JOBS_SECRET = savedSecret;
});

describe("POST /api/jobs/dunning", () => {
  it("503 when JOBS_SECRET is not configured", async () => {
    delete process.env.JOBS_SECRET;
    expect((await POST(mkReq("anything"))).status).toBe(503);
  });

  it("401 with a wrong secret", async () => {
    expect((await POST(mkReq("wrong"))).status).toBe(401);
  });

  it("sends a due reminder and advances the stage", async () => {
    findMany
      .mockResolvedValueOnce([{
        id: "s1", dueAt: new Date(Date.now() - DAY), paymentToken: "tok", reminderStage: 0,
        contactEmail: "a@b.com", applicantName: "Jane", policyType: "VH", annualPremium: 1200,
      }] as never)
      .mockResolvedValueOnce([] as never);
    const res = await POST(mkReq("s3cret"));
    expect(res.status).toBe(200);
    expect(reminder).toHaveBeenCalledOnce();
    expect((await res.json()).remindersSent).toBe(1);
    expect(update.mock.calls[0][0].data.reminderStage).toBe(1);
  });

  it("does not re-send a reminder already at the current stage", async () => {
    findMany
      .mockResolvedValueOnce([{
        id: "s1", dueAt: new Date(Date.now() - DAY), paymentToken: "tok", reminderStage: 1,
        contactEmail: "a@b.com", applicantName: "Jane", policyType: "VH", annualPremium: 1200,
      }] as never)
      .mockResolvedValueOnce([] as never);
    await POST(mkReq("s3cret"));
    expect(reminder).not.toHaveBeenCalled();
  });

  it("cancels a policy whose notice window has elapsed while unpaid", async () => {
    findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{
        id: "s2", cancellationEffectiveAt: new Date(Date.now() - DAY),
        annualPremium: 1200, effectiveAt: new Date(Date.now() - 200 * DAY), expiresAt: new Date(Date.now() + 165 * DAY),
        contactEmail: "a@b.com", applicantName: "Jane", policyType: "VH", broker: { name: "Bob" },
      }] as never);
    const res = await POST(mkReq("s3cret"));
    expect(res.status).toBe(200);
    const arg = updateMany.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.coverageStatus).toBe("cancelled");
    expect(arg.data.cancelReason).toBe("Non-payment");
    expect(arg.data.earnedPremiumOwed).toBeGreaterThan(0);
    expect(cancel).toHaveBeenCalledOnce();
    expect((await res.json()).cancelled).toBe(1);
  });
});
