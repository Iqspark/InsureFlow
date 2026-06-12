// ============================================================
// CORE TYPE DEFINITIONS
// All data structures used across the application.
// ============================================================

export type QuestionType =
  | "choice"    // Large button grid (≤6 options)
  | "text"      // Free-text input
  | "number"    // Numeric input
  | "currency"  // Monetary input ($ prefix)
  | "toggle"    // Two-option Yes/No style
  | "dropdown"  // Searchable select (many options)
  | "address"   // Google Places autocomplete + map preview
  | "date";     // Date picker

export type ComparisonOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "in_list";

export interface Option {
  label: string;
  value: string | number;
  emoji?: string;
  description?: string;
}

export interface ConditionalBranch {
  when: {
    questionId?: string; // Defaults to current question's id
    operator: ComparisonOperator;
    value: string | number | boolean | string[];
  };
  nextQuestionId: string;
}

export interface UnderwritingRule {
  operator: ComparisonOperator;
  value: string | number | boolean | string[];
  decision: "decline" | "refer";
  message: string;
}

// ──────────────────────────────────────────────────────────
// QUESTION — the central data structure.
// Each row in your Excel sheet maps to one Question object.
// ──────────────────────────────────────────────────────────
export interface Question {
  id: string;                           // Unique snake_case key
  type: QuestionType;
  brokerText: string;                   // What "Alex" says  (supports {{answer_id}} interpolation)
  helperText?: string;                  // Subtext hint
  placeholder?: string;                 // Input placeholder
  options?: Option[];                   // For choice / toggle / dropdown
  defaultNextQuestionId?: string;       // Default routing
  conditionalBranches?: ConditionalBranch[];
  underwritingRules?: UnderwritingRule[];
  ratingFactor?: string;                // Key used in quoteCalculator
  required?: boolean;
  min?: number;
  max?: number;
  prefix?: string;                      // e.g. "$"
  suffix?: string;                      // e.g. "sq ft"
  inputType?: "email" | "name" | "phone" | "text"; // Drives validation mode for text questions
  minLength?: number;
  maxLength?: number;
  mustBeInteger?: boolean;              // For number questions: reject decimals
  summaryLabel?: string;                // Short label for summary/detail/PDF views
  summarySection?: string;              // Groups answers into sections in detail/PDF views
}

// ──────────────────────────────────────────────────────────
// ANSWER — one captured user response
// ──────────────────────────────────────────────────────────
export interface Answer {
  questionId: string;
  value: string | number | boolean;
  displayValue: string; // Human-readable version for UI
}

// ──────────────────────────────────────────────────────────
// QUOTE / UNDERWRITING
// ──────────────────────────────────────────────────────────
export type DecisionType = "accept" | "decline" | "refer";

export interface FactorBreakdown {
  name: string;
  multiplier: number;
  adjustment: number;
  description: string;
}

export interface UnderwritingDecision {
  decision: DecisionType;
  declineReasons: string[];
  referralReasons: string[];
}

export interface QuoteDetails extends UnderwritingDecision {
  basePremium: number;
  finalAnnualPremium: number;
  finalMonthlyPremium: number;
  coverageAmount: number;
  deductible: number;
  factors: FactorBreakdown[];
}

// ──────────────────────────────────────────────────────────
// APP PHASE
// ──────────────────────────────────────────────────────────
export type AppPhase = "intro" | "conversation" | "summary" | "result";

// ──────────────────────────────────────────────────────────
// CONVERSATION MESSAGES (for display history)
// ──────────────────────────────────────────────────────────
export interface ConversationMessage {
  id: string;
  type: "broker" | "user";
  text: string;
  questionId?: string;
}
