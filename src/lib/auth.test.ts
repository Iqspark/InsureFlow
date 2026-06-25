import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { broker: { findUnique: vi.fn() } },
}));

import { authOptions } from "./auth";
import { prisma } from "@/lib/prisma";

const findUnique = vi.mocked(prisma.broker.findUnique);
const jwt = authOptions.callbacks!.jwt!;
const session = authOptions.callbacks!.session!;

beforeEach(() => vi.clearAllMocks());

describe("auth callbacks — session re-validation (H4)", () => {
  it("stamps active=true on fresh login without a DB lookup", async () => {
    const token = await jwt({ token: {}, user: { id: "u1", name: "N", role: "ADMIN" } } as never);
    expect(token.active).toBe(true);
    expect(token.role).toBe("ADMIN");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("marks a deactivated account active=false on a later request", async () => {
    findUnique.mockResolvedValue({ role: "BROKER", active: false } as never);
    const token = await jwt({ token: { id: "u1", role: "ADMIN" } } as never);
    expect(token.active).toBe(false);
  });

  it("refreshes the role from the DB (a demoted admin loses ADMIN)", async () => {
    findUnique.mockResolvedValue({ role: "BROKER", active: true } as never);
    const token = await jwt({ token: { id: "u1", role: "ADMIN" } } as never);
    expect(token.active).toBe(true);
    expect(token.role).toBe("BROKER");
  });

  it("drops the user from the session when the account is deactivated", async () => {
    const s = await session({ session: { user: { id: "u1" } }, token: { active: false } } as never);
    expect(s.user).toBeUndefined();
  });

  it("passes through an active user with its refreshed role", async () => {
    const s = await session({
      session: { user: {} },
      token: { id: "u1", name: "N", role: "UNDERWRITER", active: true },
    } as never);
    const user = s.user as { id: string; role: string };
    expect(user.id).toBe("u1");
    expect(user.role).toBe("UNDERWRITER");
  });
});
