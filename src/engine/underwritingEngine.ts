import { Answer, ComparisonOperator, Question, UnderwritingDecision, UnderwritingRule } from "@/types";
import { QUESTIONS } from "@/data/questions";

// ============================================================
// UNDERWRITING DECISION ENGINE
// ============================================================
// Evaluates all collected answers against the underwritingRules
// defined in questions.ts and returns one of:
//   "accept"  — proceed to quote
//   "refer"   — send to a human broker for review
//   "decline" — outside underwriting appetite
// ============================================================

function compare(
  actual: string | number | boolean,
  operator: ComparisonOperator,
  target: string | number | boolean | string[]
): boolean {
  switch (operator) {
    case "equals":
      return actual === target;
    case "not_equals":
      return actual !== target;
    case "greater_than":
      return Number(actual) > Number(target);
    case "less_than":
      return Number(actual) < Number(target);
    case "greater_than_or_equal":
      return Number(actual) >= Number(target);
    case "less_than_or_equal":
      return Number(actual) <= Number(target);
    case "contains":
      return String(actual).toLowerCase().includes(String(target).toLowerCase());
    case "in_list":
      return Array.isArray(target) && target.includes(actual as string);
    default:
      return false;
  }
}

export function runUnderwritingEngine(
  answers: Record<string, Answer>,
  questions: Question[] = QUESTIONS
): UnderwritingDecision {
  const declineReasons: string[] = [];
  const referralReasons: string[] = [];

  for (const question of questions) {
    if (!question.underwritingRules?.length) continue;

    const answer = answers[question.id];
    if (answer === undefined) continue;

    for (const rule of question.underwritingRules) {
      const triggered = compare(answer.value, rule.operator, rule.value);
      if (!triggered) continue;

      if (rule.decision === "decline") {
        declineReasons.push(rule.message);
      } else {
        referralReasons.push(rule.message);
      }
    }
  }

  // DECLINE takes precedence over REFER
  if (declineReasons.length > 0) {
    return { decision: "decline", declineReasons, referralReasons: [] };
  }
  if (referralReasons.length > 0) {
    return { decision: "refer", declineReasons: [], referralReasons };
  }
  return { decision: "accept", declineReasons: [], referralReasons: [] };
}

// Evaluates a SINGLE question's underwriting rules against one answer value.
// Used to give the broker an immediate (non-blocking) heads-up when an answer
// would refer/decline — before the full quote is calculated.
export function evaluateAnswerRules(
  question: Question,
  value: string | number | boolean
): UnderwritingRule[] {
  if (!question.underwritingRules?.length) return [];
  return question.underwritingRules.filter((rule) =>
    compare(value, rule.operator, rule.value)
  );
}
