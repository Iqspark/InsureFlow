import { describe, it, expect } from "vitest";
import { FARM_QUESTIONS, FARM_FIRST_QUESTION_ID } from "./farmQuestions";

const ids = new Set(FARM_QUESTIONS.map((q) => q.id));

describe("farm question routing", () => {
  it("first question exists", () => {
    expect(ids.has(FARM_FIRST_QUESTION_ID)).toBe(true);
  });

  it("all next/branch targets resolve to a real id or __SUBMIT__", () => {
    const bad: string[] = [];
    for (const q of FARM_QUESTIONS) {
      const targets = [
        q.defaultNextQuestionId,
        ...(q.conditionalBranches ?? []).map((b) => b.nextQuestionId),
      ].filter(Boolean) as string[];
      for (const t of targets) {
        if (t !== "__SUBMIT__" && !ids.has(t)) bad.push(`${q.id} → ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every question is reachable from the first question", () => {
    const seen = new Set<string>();
    const stack = [FARM_FIRST_QUESTION_ID];
    const byId = new Map(FARM_QUESTIONS.map((q) => [q.id, q]));
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur) || cur === "__SUBMIT__") continue;
      seen.add(cur);
      const q = byId.get(cur)!;
      for (const t of [
        q.defaultNextQuestionId,
        ...(q.conditionalBranches ?? []).map((b) => b.nextQuestionId),
      ].filter(Boolean) as string[]) {
        stack.push(t);
      }
    }
    const unreachable = FARM_QUESTIONS.map((q) => q.id).filter((id) => !seen.has(id));
    expect(unreachable).toEqual([]);
  });

  it("the principal location uses the address type so the map pipeline fires", () => {
    const addr = FARM_QUESTIONS.find((q) => q.id === "property_address");
    expect(addr?.type).toBe("address");
  });
});
