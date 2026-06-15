import { describe, it, expect, vi } from "vitest";
import {
  submissionScopeWhere,
  canViewSubmission,
  canReview,
  canManageUsers,
  canBindOrPay,
  requireRole,
  type SessionUser,
} from "./access";

// next/navigation's redirect throws a special signal; stub it so we can assert calls.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const admin: SessionUser = { id: "admin-1", role: "ADMIN" };
const broker: SessionUser = { id: "broker-1", role: "BROKER" };
const otherBroker: SessionUser = { id: "broker-2", role: "BROKER" };
const underwriter: SessionUser = { id: "uw-1", role: "UNDERWRITER" };

describe("submissionScopeWhere", () => {
  it("scopes brokers to their own submissions", () => {
    expect(submissionScopeWhere(broker)).toEqual({ brokerId: "broker-1" });
  });

  it("returns an empty scope (all rows) for admins and underwriters", () => {
    expect(submissionScopeWhere(admin)).toEqual({});
    expect(submissionScopeWhere(underwriter)).toEqual({});
  });
});

describe("canViewSubmission", () => {
  const sub = { brokerId: "broker-1" };

  it("lets a broker view only their own submission", () => {
    expect(canViewSubmission(broker, sub)).toBe(true);
    expect(canViewSubmission(otherBroker, sub)).toBe(false);
  });

  it("lets admins and underwriters view any submission", () => {
    expect(canViewSubmission(admin, sub)).toBe(true);
    expect(canViewSubmission(underwriter, sub)).toBe(true);
  });

  it("handles submissions with no broker", () => {
    expect(canViewSubmission(broker, { brokerId: null })).toBe(false);
    expect(canViewSubmission(admin, { brokerId: null })).toBe(true);
  });
});

describe("canReview", () => {
  it("allows admins and underwriters, not brokers", () => {
    expect(canReview(admin)).toBe(true);
    expect(canReview(underwriter)).toBe(true);
    expect(canReview(broker)).toBe(false);
  });
});

describe("canManageUsers", () => {
  it("allows only admins", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(underwriter)).toBe(false);
    expect(canManageUsers(broker)).toBe(false);
  });
});

describe("canBindOrPay", () => {
  const sub = { brokerId: "broker-1" };

  it("allows the owning broker and any admin", () => {
    expect(canBindOrPay(broker, sub)).toBe(true);
    expect(canBindOrPay(admin, sub)).toBe(true);
  });

  it("blocks other brokers and underwriters", () => {
    expect(canBindOrPay(otherBroker, sub)).toBe(false);
    expect(canBindOrPay(underwriter, sub)).toBe(false);
  });
});

describe("requireRole", () => {
  const session = { user: { id: "uw-1", name: "UW", email: "uw@x.com", role: "UNDERWRITER" } } as never;

  it("returns the user when the role is allowed", () => {
    const user = requireRole(session, ["UNDERWRITER", "ADMIN"]);
    expect(user.role).toBe("UNDERWRITER");
  });

  it("redirects to /dashboard when the role is not allowed", () => {
    expect(() => requireRole(session, ["ADMIN"])).toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /login when there is no session", () => {
    expect(() => requireRole(null, ["ADMIN"])).toThrow("REDIRECT:/login");
  });
});
