import { Answer, Question, QuoteDetails } from "@/types";
import { QUESTIONS, FIRST_QUESTION_ID } from "./questions";
import { JEWELLER_QUESTIONS, JEWELLER_FIRST_QUESTION_ID } from "./jewellerQuestions";
import { CYBER_QUESTIONS, CYBER_FIRST_QUESTION_ID } from "./cyberQuestions";
import { CONTRACTOR_QUESTIONS, CONTRACTOR_FIRST_QUESTION_ID } from "./contractorQuestions";
import { AE_QUESTIONS, AE_FIRST_QUESTION_ID } from "./architectsEngineersQuestions";
import { RETAIL_QUESTIONS, RETAIL_FIRST_QUESTION_ID } from "./retailersQuestions";
import { RENTAL_QUESTIONS, RENTAL_FIRST_QUESTION_ID } from "./rentalHomeQuestions";
import { ITEMS_QUESTIONS, ITEMS_FIRST_QUESTION_ID } from "./personalItemsQuestions";
import { BATTERY_QUESTIONS, BATTERY_FIRST_QUESTION_ID } from "./lithiumBatteriesQuestions";
import { calculateQuote } from "@/engine/quoteCalculator";
import { calculateJewellerQuote } from "@/engine/jewellerQuoteCalculator";
import { calculateCyberQuote } from "@/engine/cyberQuoteCalculator";
import { calculateContractorQuote } from "@/engine/contractorQuoteCalculator";
import { calculateArchitectsEngineersQuote } from "@/engine/architectsEngineersQuoteCalculator";
import { calculateRetailersQuote } from "@/engine/retailersQuoteCalculator";
import { calculateRentalHomeQuote } from "@/engine/rentalHomeQuoteCalculator";
import { calculatePersonalItemsQuote } from "@/engine/personalItemsQuoteCalculator";
import { calculateLithiumBatteriesQuote } from "@/engine/lithiumBatteriesQuoteCalculator";

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
  "cyber-liability": {
    id: "cyber-liability",
    policyType: "Cyber Liability Insurance",
    questions: CYBER_QUESTIONS,
    firstQuestionId: CYBER_FIRST_QUESTION_ID,
    calculate: calculateCyberQuote,
    intro: {
      emoji: "🛡️",
      title: "Cyber Liability Insurance",
      subtitle:
        "Protect the business against data breaches, ransomware, and network attacks. Get an instant quote in minutes.",
    },
  },
  contractor: {
    id: "contractor",
    policyType: "Contractor Insurance",
    questions: CONTRACTOR_QUESTIONS,
    firstQuestionId: CONTRACTOR_FIRST_QUESTION_ID,
    calculate: calculateContractorQuote,
    intro: {
      emoji: "🏗️",
      title: "Contractor Liability Insurance",
      subtitle:
        "General liability cover for trades and contractors. Get an instant quote in minutes.",
    },
  },
  "architects-engineers": {
    id: "architects-engineers",
    policyType: "Architects & Engineers Insurance",
    questions: AE_QUESTIONS,
    firstQuestionId: AE_FIRST_QUESTION_ID,
    calculate: calculateArchitectsEngineersQuote,
    intro: {
      emoji: "📐",
      title: "Architects & Engineers Insurance",
      subtitle:
        "Professional indemnity for design practices. Get an instant quote in minutes.",
    },
  },
  retailers: {
    id: "retailers",
    policyType: "Retailers Insurance",
    questions: RETAIL_QUESTIONS,
    firstQuestionId: RETAIL_FIRST_QUESTION_ID,
    calculate: calculateRetailersQuote,
    intro: {
      emoji: "🛍️",
      title: "Retailers Insurance",
      subtitle:
        "Property and liability cover for retail stores. Get an instant quote in minutes.",
    },
  },
  "rental-home": {
    id: "rental-home",
    policyType: "Rental Home Insurance",
    questions: RENTAL_QUESTIONS,
    firstQuestionId: RENTAL_FIRST_QUESTION_ID,
    calculate: calculateRentalHomeQuote,
    intro: {
      emoji: "🏘️",
      title: "Rental Home Insurance",
      subtitle:
        "Landlord cover for tenanted properties. Get an instant quote in minutes.",
    },
  },
  "personal-items": {
    id: "personal-items",
    policyType: "Personal Items Insurance",
    questions: ITEMS_QUESTIONS,
    firstQuestionId: ITEMS_FIRST_QUESTION_ID,
    calculate: calculatePersonalItemsQuote,
    intro: {
      emoji: "💍",
      title: "Personal Items Insurance",
      subtitle:
        "Scheduled cover for jewellery, art, and valuables. Get an instant quote in minutes.",
    },
  },
  "lithium-batteries": {
    id: "lithium-batteries",
    policyType: "Lithium Battery Insurance",
    questions: BATTERY_QUESTIONS,
    firstQuestionId: BATTERY_FIRST_QUESTION_ID,
    calculate: calculateLithiumBatteriesQuote,
    intro: {
      emoji: "🔋",
      title: "Lithium Battery Product Liability",
      subtitle:
        "Product liability for battery makers, importers, and distributors. Get an instant quote in minutes.",
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
