import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { submission: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({ sendProposalEmail: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/baseUrl", () => ({ publicBaseUrl: () => "https://app.example" }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendProposalEmail } from "@/lib/email";

const session = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.submission.findUnique);
const update = vi.mocked(prisma.submission.update);
const sendEmail = vi.mocked(sendProposalEmail);

let n = 0;
const ctx = () => ({ params: Promise.resolve({ id: `sub${++n}` }) } as never);
const req = {} as never;

const acceptedQuote = {
  id: "sub1", deletedAt: null, brokerId: "broker1", decision: "accept",
  purchased: false, paymentStatus: "unpaid", contactEmail: "jane@example.com",
  applicantName: "Jane", policyType: "Vacant Home Insurance", annualPremium: 1200,
  broker: { name: "Broker Bob" },
};

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: "broker1", role: "BROKER", name: "Bob" } } as never);
  update.mockResolvedValue({} as never);
  sendEmail.mockResolvedValue({ sentTo: "jane@example.com", previewUrl: null } as never);
});

describe("POST /api/submissions/[id]/send-proposal", () => {
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(401);
  });

  it("404 when the submission isn't the caller's", async () => {
    findUnique.mockResolvedValue({ ...acceptedQuote, brokerId: "other" } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(404);
  });

  it("400 for a non-accepted quote", async () => {
    findUnique.mockResolvedValue({ ...acceptedQuote, decision: "refer" } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("409 when already bound", async () => {
    findUnique.mockResolvedValue({ ...acceptedQuote, purchased: true } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
  });

  it("422 when there's no applicant email", async () => {
    findUnique.mockResolvedValue({ ...acceptedQuote, contactEmail: null } as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(422);
  });

  it("issues a proposal token, sets awaiting_signature, clears prior signature, and emails", async () => {
    findUnique.mockResolvedValue(acceptedQuote as never);
    const res = await POST(req, ctx());
    expect(res.status).toBe(200);
    const data = (update.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.coverageStatus).toBe("awaiting_signature");
    expect(data.signedAt).toBeNull();
    expect(typeof data.proposalToken).toBe("string");
    expect(data.proposalTokenExpiresAt).toBeInstanceOf(Date);
    expect(sendEmail).toHaveBeenCalledOnce();
    const emailArg = sendEmail.mock.calls[0]?.[0] as { signUrl: string };
    expect(emailArg.signUrl).toContain(`/proposal/${data.proposalToken}`);
  });
});
