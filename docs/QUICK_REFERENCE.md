# Quick Reference Card

A one-page cheat sheet for the most common tasks. Keep this open when editing the data files.

---

## Adding a New Question

1. Open `src/data/questions.ts`
2. Add a new object to the `QUESTIONS` array
3. Set the previous question's `defaultNextQuestionId` to your new question's `id`
4. Set your new question's `defaultNextQuestionId` to the next question's `id`

**Minimal question (no branching, no UW rule):**

```typescript
{
  id: "roof_type",
  type: "choice",
  brokerText: "What type of roof does the property have?",
  options: [
    { label: "Shingle",  value: "shingle" },
    { label: "Tile",     value: "tile" },
    { label: "Metal",    value: "metal" },
    { label: "Flat",     value: "flat" },
  ],
  defaultNextQuestionId: "next_question_id_here",
},
```

---

## Adding a Decline Rule to a Question

```typescript
underwritingRules: [
  {
    operator: "equals",        // See operator table below
    value: "flat",             // The answer value that triggers the rule
    decision: "decline",       // or "refer"
    message: "Flat roofs on vacant properties are outside our appetite.",
  },
],
```

---

## Adding a Conditional Branch

```typescript
conditionalBranches: [
  {
    when: { operator: "equals", value: "yes" },
    nextQuestionId: "follow_up_question_id",
  },
],
defaultNextQuestionId: "default_if_no_branch_matches",
```

---

## Operator Reference

| Operator | Example test | Notes |
|---|---|---|
| `"equals"` | `value === "yes"` | Exact, case-sensitive |
| `"not_equals"` | `value !== "no"` | |
| `"greater_than"` | `value > 1900` | Numbers only |
| `"less_than"` | `value < 5` | Numbers only |
| `"greater_than_or_equal"` | `value >= 80` | Numbers only |
| `"less_than_or_equal"` | `value <= 100` | Numbers only |
| `"contains"` | `"fire"` in value | Case-insensitive string match |
| `"in_list"` | `value: ["HI","AK"]` | Checks if answer is in the array |

---

## Input Type Reference

| `type` | Best for | Needs `options`? |
|---|---|---|
| `"choice"` | 2–6 button options | Yes |
| `"toggle"` | Yes / No | Yes (exactly 2) |
| `"text"` | Name, email, free text | No |
| `"number"` | Year, sq ft, count | No (add `min`/`max`) |
| `"currency"` | Dollar amounts | No (add `min`/`max`) |
| `"dropdown"` | 7+ options with search | Yes |
| `"date"` | Calendar date | No |

---

## Pricing Formula (Summary)

```
Premium = $500 (base)
  × state_factor
  × vacancy_duration_factor
  × property_type_factor
  × property_value_factor
  × year_built_factor
  × inspection_frequency_factor
  × security_factor
  × prior_claims_factor
  × deductible_factor
  × coverage_percent_factor
  + flat_adjustments ($)
```

All factors live in `src/data/ratingFactors.ts`.
Handlers live in `src/engine/quoteCalculator.ts`.

---

## Decision Outcomes

| Outcome | When | Screen |
|---|---|---|
| **Accept** | No UW rules triggered | Premium breakdown + Buy button |
| **Decline** | Any `decision: "decline"` rule fires | Polite rejection + reason(s) |
| **Refer** | Only `decision: "refer"` rules fire | "Specialist will call" + next steps |

Decline always beats Refer if both are triggered.

---

## Using a Previous Answer in Broker Text

```typescript
brokerText: "Thanks {{applicant_name}}, one more question…"
//                  ↑ replaced with the value of answers["applicant_name"]
```

---

## Ending the Questionnaire

Set the last question's `defaultNextQuestionId` to `"__SUBMIT__"`:

```typescript
{
  id: "contact_email",
  ...
  defaultNextQuestionId: "__SUBMIT__",   // ← ends the flow
},
```

---

## Running the App

```bash
npm run dev      # Development — http://localhost:3000
npm run build    # Production build (checks for errors)
npm start        # Run the production build
```

---

## File Map (Where Is What?)

| I want to change… | Edit this file |
|---|---|
| Questions / options / branching | `src/data/questions.ts` |
| Rating multipliers | `src/data/ratingFactors.ts` |
| Decline / Refer rules | `src/data/questions.ts` → `underwritingRules` |
| Quote calculation logic | `src/engine/quoteCalculator.ts` |
| Underwriting evaluation logic | `src/engine/underwritingEngine.ts` |
| Chat bubble style | `src/components/ChatBubble.tsx` |
| Typing delay (ms) | `src/components/ConversationView.tsx` → `TYPING_DELAY_MS` |
| Progress bar | `src/components/ProgressBar.tsx` |
| Summary screen | `src/components/SummaryScreen.tsx` |
| Result screens | `src/components/QuoteResult.tsx` |
| Broker avatar / name ("Alex") | `src/components/ConversationView.tsx`, `ChatBubble.tsx` |
| App colours | `tailwind.config.ts` + inline Tailwind classes |
| Welcome screen | `src/components/IntroScreen.tsx` |
| Page-level layout | `src/app/page.tsx` |
| Fonts / metadata | `src/app/layout.tsx` |
