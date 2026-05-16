# Data Guide — Mapping Your Excel File to the App

This is the practical guide for converting your underwriting Excel spreadsheet into the JSON format the application reads. No programming experience is required for this step — it is a structured data-entry task.

---

## Table of Contents

1. [The Two Files You Need to Edit](#the-two-files-you-need-to-edit)
2. [Excel Sheet Layout (Recommended)](#excel-sheet-layout-recommended)
3. [The Question Object — Every Field Explained](#the-question-object--every-field-explained)
4. [Input Types — Choosing the Right One](#input-types--choosing-the-right-one)
5. [Options — Formatting the Answer Choices](#options--formatting-the-answer-choices)
6. [Conditional Branching — Routing Between Questions](#conditional-branching--routing-between-questions)
7. [Underwriting Rules — Decline and Refer Triggers](#underwriting-rules--decline-and-refer-triggers)
8. [Rating Factors — Linking Questions to Pricing](#rating-factors--linking-questions-to-pricing)
9. [Broker Text Interpolation (Using Previous Answers)](#broker-text-interpolation-using-previous-answers)
10. [Worked Example — A Complete Question](#worked-example--a-complete-question)
11. [Common Mistakes & How to Avoid Them](#common-mistakes--how-to-avoid-them)
12. [Quick Checklist Before Going Live](#quick-checklist-before-going-live)

---

## The Two Files You Need to Edit

| File | What it contains | When to edit |
|---|---|---|
| `src/data/questions.ts` | Every question, its options, branching rules, and UW triggers | Every time you add/change/remove a question |
| `src/data/ratingFactors.ts` | All pricing multipliers and flat dollar adjustments | Every time actuals change or a new rating factor is added |

Everything else — all UI components, animations, engines — reads from these two files automatically.

---

## Excel Sheet Layout (Recommended)

Structure your Excel workbook with the following tabs:

### Tab 1 — "Questions"

| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I |
|---|---|---|---|---|---|---|---|---|
| `id` | `type` | `brokerText` | `helperText` | `defaultNextQuestionId` | `options` (JSON) | `conditionalBranches` (JSON) | `underwritingRules` (JSON) | `ratingFactor` |

### Tab 2 — "Rating Factors"

| Col A | Col B | Col C |
|---|---|---|
| Factor Name | Answer Value | Multiplier |
| State | CA | 1.30 |
| State | TX | 1.15 |
| Vacancy Duration | 0-6m | 1.00 |
| … | … | … |

### Tab 3 — "UW Rules" (optional — for documentation)

Keep a plain-English version of all your decline/refer rules here for review by underwriters. This does NOT feed the app directly — you manually translate these into the `underwritingRules` array in Tab 1.

---

## The Question Object — Every Field Explained

Each question in `src/data/questions.ts` is a TypeScript object. Below is every possible field:

```typescript
{
  // ── REQUIRED ────────────────────────────────────────────────
  id: "vacancy_duration",
  // Unique identifier. Use snake_case. No spaces. Used as the key in the
  // answers map and in conditional branch references.
  // Excel Column A.

  type: "choice",
  // The input widget to render. See "Input Types" section below.
  // Excel Column B.

  brokerText: "How long has the property been vacant?",
  // The message Alex "says". Displayed in a white chat bubble.
  // Supports {{answer_id}} placeholders — see Interpolation section.
  // Excel Column C.

  // ── OPTIONAL ────────────────────────────────────────────────
  helperText: "This affects your rate significantly.",
  // Small grey hint text shown below the input widget.
  // Excel Column D.

  defaultNextQuestionId: "vacancy_reason",
  // The question to go to after this one, unless a conditionalBranch
  // overrides it. Use "__SUBMIT__" to end the questionnaire.
  // Excel Column E.

  options: [
    { label: "Under 6 months", value: "0-6m", emoji: "📅" },
    { label: "6–12 months",    value: "6-12m" },
  ],
  // Required for types: choice, toggle, dropdown.
  // Each option needs at minimum a label (shown to user) and
  // a value (saved internally). emoji and description are optional.
  // Excel Column F (as JSON array or one row per option in a sub-table).

  conditionalBranches: [
    {
      when: { operator: "equals", value: "yes" },
      nextQuestionId: "pool_fenced",
    },
  ],
  // Optional routing overrides. Evaluated before defaultNextQuestionId.
  // Excel Column G (as JSON array).

  underwritingRules: [
    {
      operator: "equals",
      value: "5y+",
      decision: "decline",
      message: "Properties vacant for more than 5 years cannot be covered.",
    },
  ],
  // Triggers that fire during final underwriting evaluation.
  // Excel Column H (as JSON array).

  ratingFactor: "vacancyDuration",
  // The key used in quoteCalculator.ts to look up this answer's multiplier.
  // Leave blank if this question has no effect on pricing.
  // Excel Column I.

  // ── NUMBER / CURRENCY INPUTS ONLY ───────────────────────────
  min: 0,
  max: 100,
  placeholder: "e.g. 1985",
  prefix: "$",    // Shown before the input (e.g. dollar sign)
  suffix: "sq ft", // Shown after the input (e.g. unit label)
  required: true,  // If true, the submit button stays disabled until filled
}
```

---

## Input Types — Choosing the Right One

| `type` value | Widget rendered | Use when… |
|---|---|---|
| `"choice"` | Grid of large tappable buttons | 2–6 pre-set options; options are the primary answer |
| `"toggle"` | Two full-width buttons side by side | Exactly 2 options, typically Yes / No |
| `"text"` | Single-line text field | Name, email, address — any free-form string |
| `"number"` | Numeric field with min/max validation | Year built, square footage, number of claims |
| `"currency"` | $ prefixed field, auto-formats with commas | Property value, coverage amount, any dollar figure |
| `"dropdown"` | Searchable select list | Long lists (50+ options) like US states |
| `"date"` | Native date picker | Dates — policy start date, date purchased, etc. |

**Rule of thumb:** use `choice` when you have ≤ 6 options and want big tappable buttons. Switch to `dropdown` when you have more options than can fit on screen comfortably.

---

## Options — Formatting the Answer Choices

Options are an array of objects. Only `label` and `value` are required.

```typescript
options: [
  { label: "Single Family Home", value: "single_family", emoji: "🏠" },
  { label: "Condo / Apartment",  value: "condo",         emoji: "🏢", description: "Unit in a multi-unit building" },
]
```

| Field | Required | Description |
|---|---|---|
| `label` | Yes | Text shown on the button. Keep it short (≤ 30 chars). |
| `value` | Yes | The value saved internally. Use short, consistent strings (snake_case or codes). |
| `emoji` | No | Displayed above the label on `choice` buttons. |
| `description` | No | Small sub-label below the main label. Good for explaining trade-offs. |

**Important:** `value` is what conditional branches and underwriting rules compare against — not `label`. Keep values stable even if you rename labels.

---

## Conditional Branching — Routing Between Questions

### Basic branch: if answer to THIS question equals X, go to Y

```typescript
conditionalBranches: [
  {
    when: { operator: "equals", value: "yes" },
    nextQuestionId: "pool_fenced",
  },
]
```

### Advanced branch: if the answer to a DIFFERENT earlier question equals X, go to Y

```typescript
conditionalBranches: [
  {
    when: {
      questionId: "property_state",   // look at this earlier question
      operator: "equals",
      value: "FL",
    },
    nextQuestionId: "hurricane_deductible",
  },
]
```

### Multiple branches (evaluated in order — first match wins)

```typescript
conditionalBranches: [
  { when: { operator: "equals", value: "fire"  }, nextQuestionId: "fire_details" },
  { when: { operator: "equals", value: "water" }, nextQuestionId: "water_details" },
  // If neither matched, defaultNextQuestionId is used
]
```

### Supported Operators

| Operator | Example | Notes |
|---|---|---|
| `"equals"` | `value: "yes"` | Exact match. Type-sensitive: `"1"` ≠ `1`. |
| `"not_equals"` | `value: "no"` | Matches anything except the given value. |
| `"greater_than"` | `value: 1900` | Numeric only. Converts both sides with `Number()`. |
| `"less_than"` | `value: 5` | Numeric only. |
| `"greater_than_or_equal"` | `value: 80` | Numeric only. |
| `"less_than_or_equal"` | `value: 100` | Numeric only. |
| `"contains"` | `value: "fire"` | Case-insensitive substring match. |
| `"in_list"` | `value: ["HI", "AK"]` | `value` must be an array. Matches if answer is in the list. |

### Special destination IDs

| Value | Meaning |
|---|---|
| `"__SUBMIT__"` | Ends the questionnaire, goes to Summary screen |
| Any `question.id` | Goes to that question |

---

## Underwriting Rules — Decline and Refer Triggers

Underwriting rules are evaluated **all at once** when the user clicks "Calculate My Quote" on the Summary screen — not question by question. They use the same operators as conditional branches.

```typescript
underwritingRules: [
  {
    operator: "equals",
    value: "5y+",
    decision: "decline",
    message: "Properties vacant for more than 5 years cannot be covered under our program.",
  },
  {
    operator: "equals",
    value: "3-5y",
    decision: "refer",
    message: "Properties vacant 3–5 years require underwriter review.",
  },
]
```

| Field | Description |
|---|---|
| `operator` | Same operators as conditional branches above |
| `value` | The threshold to compare against |
| `decision` | `"decline"` — reject; `"refer"` — send to human broker |
| `message` | The text shown to the user on the Decline or Refer screen. Write this in plain English. |

### Priority

If a single run produces both decline and refer triggers, **decline wins**. All decline reasons are shown together; refer reasons are only shown when there are no declines.

### Best practices for messages

- Write decline messages with empathy: *"Unfortunately, this property falls outside our underwriting guidelines."*
- Write refer messages with reassurance: *"A specialist will review this and contact you within one business day."*
- Do not include technical jargon or internal codes in messages — users read these directly.

---

## Rating Factors — Linking Questions to Pricing

The `ratingFactor` field on a question is a string key. That key must be handled in `src/engine/quoteCalculator.ts`.

### Step 1: Add the key to the question

```typescript
{
  id: "construction_type",
  ...
  ratingFactor: "constructionType",   // ← this is the key
}
```

### Step 2: Add the factor table in `src/data/ratingFactors.ts`

```typescript
export const CONSTRUCTION_TYPE_FACTORS: Record<string, number> = {
  frame:    1.10,   // wood frame — higher risk
  masonry:  1.00,   // brick/concrete — base
  steel:    0.95,   // steel frame — slight discount
};
```

### Step 3: Apply it in `src/engine/quoteCalculator.ts`

```typescript
const constructionType = String(answers.construction_type?.value ?? "masonry");
const ctFactor = CONSTRUCTION_TYPE_FACTORS[constructionType] ?? 1.0;
applyFactor("Construction Type", ctFactor, answers.construction_type?.displayValue ?? "");
```

### Factor conventions

| Value | Meaning |
|---|---|
| `1.00` | No change — base/neutral rate |
| `> 1.00` | Surcharge (e.g. `1.25` = +25%) |
| `< 1.00` | Discount (e.g. `0.90` = −10%) |
| `0.00` | Should never reach the calculator — handled by a decline rule |

---

## Broker Text Interpolation (Using Previous Answers)

You can include a previous answer inside any broker message using double curly braces:

```typescript
brokerText: "Great to meet you, {{applicant_name}}! Which state is the property in?"
```

If the user answered "Sarah" to the `applicant_name` question, Alex will say:
**"Great to meet you, Sarah! Which state is the property in?"**

The placeholder format is: `{{question_id}}` — use the `id` of any question that has already been answered.

---

## Worked Example — A Complete Question

### Excel row

| id | type | brokerText | helperText | defaultNext | options | conditionalBranches | underwritingRules | ratingFactor |
|---|---|---|---|---|---|---|---|---|
| `heating_type` | `choice` | What is the primary heating source? | Older systems can increase risk. | `has_pool` | (see below) | (none) | (see below) | `heatingType` |

**Options:**
```json
[
  { "label": "Gas furnace",    "value": "gas",      "emoji": "🔥" },
  { "label": "Electric",       "value": "electric", "emoji": "⚡" },
  { "label": "Oil furnace",    "value": "oil",      "emoji": "🛢️" },
  { "label": "No heat / None", "value": "none",     "emoji": "❄️" }
]
```

**UW Rules:**
```json
[
  {
    "operator": "equals",
    "value": "none",
    "decision": "refer",
    "message": "Properties with no heating in cold climates require underwriter review."
  }
]
```

### Resulting TypeScript

```typescript
{
  id: "heating_type",
  type: "choice",
  brokerText: "What is the primary heating source for the property?",
  helperText: "Older heating systems can increase your risk profile.",
  options: [
    { label: "Gas furnace",    value: "gas",      emoji: "🔥" },
    { label: "Electric",       value: "electric", emoji: "⚡" },
    { label: "Oil furnace",    value: "oil",      emoji: "🛢️" },
    { label: "No heat / None", value: "none",     emoji: "❄️" },
  ],
  defaultNextQuestionId: "has_pool",
  underwritingRules: [
    {
      operator: "equals",
      value: "none",
      decision: "refer",
      message: "Properties with no heating in cold climates require underwriter review.",
    },
  ],
  ratingFactor: "heatingType",
},
```

---

## Common Mistakes & How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| Two questions share the same `id` | Answers overwrite each other silently | Every `id` must be globally unique |
| `conditionalBranch.nextQuestionId` references a non-existent id | App freezes on that answer | Double-check all target IDs exist in the `QUESTIONS` array |
| `value` in options doesn't match `value` in UW rule | Rule never fires | Copy the exact value string — they are case-sensitive |
| `ratingFactor` string doesn't match anything in `quoteCalculator.ts` | Factor silently skipped (no error) | Add the handler in the calculator |
| A question has no `defaultNextQuestionId` | Flow stops | Every non-terminal question must have a default next |
| Using a numeric `value` in a rule but stored as string | Rule never fires | Ensure types match: `value: 1` vs `value: "1"` |
| Forgetting `"__SUBMIT__"` on the last question | Flow never reaches Summary | Set `defaultNextQuestionId: "__SUBMIT__"` on your final question |

---

## Quick Checklist Before Going Live

- [ ] Every question has a unique `id`
- [ ] Every question has a `defaultNextQuestionId` (or `"__SUBMIT__"` if last)
- [ ] All `conditionalBranch.nextQuestionId` values reference real question IDs
- [ ] The first question ID matches `FIRST_QUESTION_ID` in `questions.ts`
- [ ] All `ratingFactor` keys are handled in `quoteCalculator.ts`
- [ ] All UW rule `value` types match their corresponding option `value` types
- [ ] Messages in `underwritingRules` are written in plain, customer-friendly English
- [ ] Rating factor tables in `ratingFactors.ts` cover every possible option value
- [ ] A fallback `?? 1.0` exists in the calculator for every factor lookup (already the case)
- [ ] You have tested at least one Decline path, one Refer path, and one Accept path
