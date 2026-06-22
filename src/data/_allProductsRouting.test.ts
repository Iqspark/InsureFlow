import { describe, it, expect } from "vitest";
import { PRODUCTS } from "./products";

// Intentionally not in the flow — auto-derived from the address input's `extra`.
const AUTO_DERIVED = new Set(["property_province"]);

// Validates every product's question graph: targets resolve, all questions are
// reachable from the first question, and __SUBMIT__ is reachable.
describe("all products — question routing integrity", () => {
  for (const [slug, product] of Object.entries(PRODUCTS)) {
    describe(slug, () => {
      const questions = product.questions;
      const ids = new Set(questions.map((q) => q.id));
      const targets = (q: (typeof questions)[number]) =>
        [
          q.defaultNextQuestionId,
          ...(q.conditionalBranches ?? []).map((b) => b.nextQuestionId),
        ].filter(Boolean) as string[];

      it("first question exists", () => {
        expect(ids.has(product.firstQuestionId)).toBe(true);
      });

      it("all next/branch targets resolve to a real id or __SUBMIT__", () => {
        const bad: string[] = [];
        for (const q of questions) {
          for (const t of targets(q)) {
            if (t !== "__SUBMIT__" && !ids.has(t)) bad.push(`${q.id} → ${t}`);
          }
        }
        expect(bad).toEqual([]);
      });

      it("every question is reachable and __SUBMIT__ is reachable", () => {
        const byId = new Map(questions.map((q) => [q.id, q]));
        const seen = new Set<string>();
        let reachesSubmit = false;
        const stack = [product.firstQuestionId];
        while (stack.length) {
          const cur = stack.pop()!;
          if (cur === "__SUBMIT__") { reachesSubmit = true; continue; }
          if (seen.has(cur)) continue;
          seen.add(cur);
          for (const t of targets(byId.get(cur)!)) stack.push(t);
        }
        const unreachable = questions
          .map((q) => q.id)
          .filter((id) => !seen.has(id) && !AUTO_DERIVED.has(id));
        expect({ unreachable, reachesSubmit }).toEqual({ unreachable: [], reachesSubmit: true });
      });

      it("ids are unique", () => {
        expect(ids.size).toBe(questions.length);
      });
    });
  }
});
