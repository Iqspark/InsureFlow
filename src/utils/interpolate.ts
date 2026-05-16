import { Answer } from "@/types";

// Replaces {{answer_id}} placeholders in broker text with real values.
// e.g. "Great to meet you, {{applicant_name}}!" → "Great to meet you, Sarah!"
export function interpolate(
  template: string,
  answers: Record<string, Answer>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = answers[key]?.displayValue;
    return val !== undefined ? String(val) : "";
  });
}
