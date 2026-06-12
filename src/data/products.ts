import { Answer, Question, QuoteDetails } from "@/types";
import { QUESTIONS, FIRST_QUESTION_ID } from "./questions";
import { JEWELLER_QUESTIONS, JEWELLER_FIRST_QUESTION_ID } from "./jewellerQuestions";
import { calculateQuote } from "@/engine/quoteCalculator";
import { calculateJewellerQuote } from "@/engine/jewellerQuoteCalculator";

// ============================================================
// PRODUCT REGISTRY
// ============================================================
// Each insurance product plugs in its own question flow,
// quote calculator, and presentation. The conversational engine,
// persistence, and result UI are shared across all products.
// ============================================================

export interface ProductConfig {
  id: string;                 // URL slug, e.g. "jeweller-block"
  policyType: string;         // Stored on the Submission + shown in UI
  questions: Question[];
  firstQuestionId: string;
  calculate: (answers: Record<string, Answer>) => QuoteDetails;
  intro: { emoji: string; title: string; subtitle: string };
}

export const PRODUCTS: Record<string, ProductConfig> = {
  "vacant-home": {
    id: "vacant-home",
    policyType: "Vacant Home Insurance",
    questions: QUESTIONS,
    firstQuestionId: FIRST_QUESTION_ID,
    calculate: calculateQuote,
    intro: {
      emoji: "🏠",
      title: "Vacant Home Insurance",
      subtitle:
        "Get an instant quote in under 3 minutes. No paperwork. No calls. Just answers.",
    },
  },
  "jeweller-block": {
    id: "jeweller-block",
    policyType: "Jeweller Block Insurance",
    questions: JEWELLER_QUESTIONS,
    firstQuestionId: JEWELLER_FIRST_QUESTION_ID,
    calculate: calculateJewellerQuote,
    intro: {
      emoji: "💎",
      title: "Jeweller's Block Insurance",
      subtitle:
        "Cover your stock against theft, robbery, and damage. Get an instant quote in minutes.",
    },
  },
};

export const DEFAULT_PRODUCT_ID = "vacant-home";

export function getProduct(productId: string | undefined): ProductConfig {
  return PRODUCTS[productId ?? DEFAULT_PRODUCT_ID] ?? PRODUCTS[DEFAULT_PRODUCT_ID];
}

// Reverse lookup used by the detail page's "Resume" link.
export function productSlugForPolicyType(policyType: string): string {
  const match = Object.values(PRODUCTS).find((p) => p.policyType === policyType);
  return match?.id ?? DEFAULT_PRODUCT_ID;
}
