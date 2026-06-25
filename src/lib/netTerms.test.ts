import { describe, it, expect, afterEach } from "vitest";
import {
  resolveNetTermDays, dueDate, payTokenExpiry, earnedPremium,
  reminderStageFor, canIssueNoticeOfCancellation, addDays,
} from "./netTerms";

const envKeys = ["DEFAULT_NET_TERM_DAYS", "NONPAY_GRACE_DAYS", "CANCELLATION_NOTICE_DAYS"];
const saved: Record<string, string | undefined> = {};
for (const k of envKeys) saved[k] = process.env[k];
afterEach(() => {
  for (const k of envKeys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const DAY = 86_400_000;

describe("resolveNetTermDays", () => {
  it("uses the default (30) when no override", () => {
    delete process.env.DEFAULT_NET_TERM_DAYS;
    expect(resolveNetTermDays()).toBe(30);
  });
  it("honors a per-policy override including 0 (due on receipt)", () => {
    expect(resolveNetTermDays(15)).toBe(15);
    expect(resolveNetTermDays(0)).toBe(0);
  });
  it("reads DEFAULT_NET_TERM_DAYS from env", () => {
    process.env.DEFAULT_NET_TERM_DAYS = "45";
    expect(resolveNetTermDays()).toBe(45);
  });
});

describe("dueDate + payTokenExpiry", () => {
  it("dueDate is boundAt + term", () => {
    const bound = new Date("2026-01-01T00:00:00Z");
    expect(dueDate(bound, 30).getTime()).toBe(addDays(bound, 30).getTime());
  });
  it("token expiry outlives the invoice + grace + notice window, with a 30-day floor", () => {
    delete process.env.NONPAY_GRACE_DAYS;
    delete process.env.CANCELLATION_NOTICE_DAYS;
    const bound = new Date("2026-01-01T00:00:00Z");
    const due = dueDate(bound, 30);
    const exp = payTokenExpiry(bound, due);
    // max(due, bound+30) + 7 + 15 = due + 22 days
    expect(Math.round((exp.getTime() - due.getTime()) / DAY)).toBe(22);
    expect(exp.getTime()).toBeGreaterThan(due.getTime());
  });
});

describe("reminderStageFor", () => {
  const due = new Date("2026-01-10T00:00:00Z");
  it("0 before due, 1 on due, 2 at +3, 3 at +7", () => {
    expect(reminderStageFor(due, new Date("2026-01-09T00:00:00Z"))).toBe(0);
    expect(reminderStageFor(due, due)).toBe(1);
    expect(reminderStageFor(due, addDays(due, 3))).toBe(2);
    expect(reminderStageFor(due, addDays(due, 7))).toBe(3);
  });
});

describe("canIssueNoticeOfCancellation", () => {
  it("only once past due by the grace period", () => {
    delete process.env.NONPAY_GRACE_DAYS; // default 7
    const due = new Date("2026-01-10T00:00:00Z");
    expect(canIssueNoticeOfCancellation(due, addDays(due, 6))).toBe(false);
    expect(canIssueNoticeOfCancellation(due, addDays(due, 7))).toBe(true);
  });
});

describe("earnedPremium", () => {
  it("pro-rates the days on risk over the term", () => {
    const eff = new Date("2026-01-01T00:00:00Z");
    const exp = addDays(eff, 365);
    // cancelled at ~ half the term
    const cancelled = addDays(eff, 182);
    const earned = earnedPremium(1200, eff, exp, cancelled);
    expect(earned).toBe(Math.round((1200 * 182) / 365));
  });
  it("clamps to [0, full premium]", () => {
    const eff = new Date("2026-01-01T00:00:00Z");
    const exp = addDays(eff, 365);
    expect(earnedPremium(1200, eff, exp, eff)).toBe(0);
    expect(earnedPremium(1200, eff, exp, addDays(exp, 30))).toBe(1200);
  });
});
