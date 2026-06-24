import { describe, it, expect } from "vitest";
import { policyNumber } from "./policyNumber";

const id = "cmqipzjhr000114ljgjujxif7";

describe("policyNumber", () => {
  it("formats as PREFIX-YEAR-CODE for a known product", () => {
    const n = policyNumber({ id, policyType: "Vacant Home Insurance", createdAt: new Date("2026-03-15") });
    expect(n).toMatch(/^VH-2026-[A-Z0-9]{6}$/);
  });

  it("uses the right prefix per product", () => {
    // Local-time constructor (Y, M, D) to avoid UTC-parse year drift.
    const make = (policyType: string) =>
      policyNumber({ id, policyType, createdAt: new Date(2026, 5, 15) });
    expect(make("Jeweller Block Insurance")).toMatch(/^JB-2026-/);
    expect(make("Farm Insurance")).toMatch(/^FRM-2026-/);
    expect(make("Cyber Liability Insurance")).toMatch(/^CY-2026-/);
    expect(make("Lithium Battery Insurance")).toMatch(/^LB-2026-/);
  });

  it("derives the year from createdAt", () => {
    expect(
      policyNumber({ id, policyType: "Farm Insurance", createdAt: new Date(2024, 5, 15) })
    ).toMatch(/^FRM-2024-/);
  });

  it("is deterministic for the same submission", () => {
    const sub = { id, policyType: "Farm Insurance", createdAt: new Date(2026, 4, 1) };
    expect(policyNumber(sub)).toBe(policyNumber(sub));
  });

  it("still produces a valid number for an unknown product (default prefix)", () => {
    expect(
      policyNumber({ id, policyType: "Totally Unknown Insurance", createdAt: new Date(2026, 0, 1) })
    ).toMatch(/^[A-Z]+-2026-[A-Z0-9]{6}$/);
  });

  it("accepts an ISO date string for createdAt", () => {
    expect(
      policyNumber({ id, policyType: "Vacant Home Insurance", createdAt: "2026-07-09T10:00:00Z" })
    ).toMatch(/^VH-2026-/);
  });
});
