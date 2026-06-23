# Data Guide — Mapping Your Excel File to the App

This is the practical guide for converting your underwriting Excel spreadsheet into the JSON/TypeScript format the application reads. No deep programming experience is required for the day-to-day work — it is a structured data-entry task.

InsureFlow is **multi-product** — it currently ships **ten** packages, each a self-contained set of questions + a rating-factors table + a quote calculator that plug into a shared product registry:

| Slug | Product | Files |
|---|---|---|
| `vacant-home` | Vacant Home | `questions.ts` / `ratingFactors.ts` / `quoteCalculator.ts` |
| `rental-home` | Rental Home | `rentalHomeQuestions.ts` / `rentalHomeRatingFactors.ts` / `rentalHomeQuoteCalculator.ts` |
| `farm` | Farm (module-structured) | `farmQuestions.ts` / `farmRatingFactors.ts` / `farmQuoteCalculator.ts` |
| `jeweller-block` | Jeweller's Block | `jewellerQuestions.ts` / `jewellerRatingFactors.ts` / `jewellerQuoteCalculator.ts` |
| `cyber-liability` | Cyber Liability | `cyberQuestions.ts` / `cyberRatingFactors.ts` / `cyberQuoteCalculator.ts` |
| `contractor` | Contractor | `contractorQuestions.ts` / `contractorRatingFactors.ts` / `contractorQuoteCalculator.ts` |
| `architects-engineers` | Architects & Engineers | `architectsEngineersQuestions.ts` / `architectsEngineersRatingFactors.ts` / `architectsEngineersQuoteCalculator.ts` |
| `retailers` | Retailers | `retailersQuestions.ts` / `retailersRatingFactors.ts` / `retailersQuoteCalculator.ts` |
| `personal-items` | Personal Items | `personalItemsQuestions.ts` / `personalItemsRatingFactors.ts` / `personalItemsQuoteCalculator.ts` |
| `lithium-batteries` | Lithium Batteries | `lithiumBatteriesQuestions.ts` / `lithiumBatteriesRatingFactors.ts` / `lithiumBatteriesQuoteCalculator.ts` |

(Questions and rating-factor files live in `src/data/`; calculators live in `src/engine/`.) The examples below mostly use Vacant Home and Jeweller's Block, but the same pattern applies to every product. **Farm** is module-structured — its questions mirror the paper application's modules (General Information, Locations, Habitational, Farm Buildings, Machinery & Equipment, Livestock, etc.) as conversational sections. This guide teaches the question/pricing data model, then walks through adding a new question and adding a whole new product.

---

## Table of Contents

1. [The Files You Edit](#the-files-you-edit)
2. [How a Product Plugs In](#how-a-product-plugs-in)
3. [Excel Sheet Layout (Recommended)](#excel-sheet-layout-recommended)
4. [The Question Object — Every Field Explained](#the-question-object--every-field-explained)
5. [Input Types — Choosing the Right One](#input-types--choosing-the-right-one)
6. [Options — Formatting the Answer Choices](#options--formatting-the-answer-choices)
7. [Conditional Branching — Routing Between Questions](#conditional-branching--routing-between-questions)
8. [Underwriting Rules — Decline and Refer Triggers](#underwriting-rules--decline-and-refer-triggers)
9. [Rating Factors — Linking Questions to Pricing](#rating-factors--linking-questions-to-pricing)
10. [Summary & Sections — summaryLabel / summarySection](#summary--sections--summarylabel--summarysection)
11. [Broker Text Interpolation (Using Previous Answers)](#broker-text-interpolation-using-previous-answers)
12. [Special Inputs — Address & Phone](#special-inputs--address--phone)
13. [Worked Example — A Complete Question](#worked-example--a-complete-question)
14. [How to Add a New Question](#how-to-add-a-new-question)
15. [How to Add a New Product / Package](#how-to-add-a-new-product--package)
16. [Common Mistakes & How to Avoid Them](#common-mistakes--how-to-avoid-them)
17. [Quick Checklist Before Going Live](#quick-checklist-before-going-live)

---

## The Files You Edit

| File | What it contains | When to edit |
|---|---|---|
| `src/data/questions.ts` | Vacant-home questions, options, branching, UW triggers | Editing the vacant-home flow |
| `src/data/ratingFactors.ts` | Vacant-home pricing multipliers + flat dollar loadings | Vacant-home actuals change |
| `src/data/jewellerQuestions.ts` | Jeweller's Block questions (same schema) | Editing the jeweller flow |
| `src/data/jewellerRatingFactors.ts` | Jeweller's Block pricing tables | Jeweller actuals change |
| `src/data/<product>Questions.ts` | The other products' question flows (same schema) | Editing that product's flow |
| `src/data/<product>RatingFactors.ts` | The other products' pricing tables | That product's actuals change |
| `src/engine/<product>QuoteCalculator.ts` | The other products' quote calculators | That product's pricing logic changes |
| `src/data/products.ts` | The product registry — wires each flow to its calculator + intro | Adding/removing a product |
| `src/utils/sections.ts` | Maps each question to a summary/progress-rail section | Adding sections to the vacant flow |
| `src/data/_allProductsRouting.test.ts` | Routing-integrity safety net (runs under `npm test`) | Automatic — no edits needed |

Everything else — all UI components, animations, the conversational engine, persistence, and result screens — reads from these files automatically. The shape of every question is defined by the `Question` interface in `src/types/index.ts`; that interface is the source of truth.

---

## How a Product Plugs In

Each product is registered in `src/data/products.ts` as a `ProductConfig`:

```typescript
export interface ProductConfig {
  id: string;          // URL slug, e.g. "jeweller-block"
  policyType: string;  // Stored on the Submission + shown in the UI
  questions: Question[];
  firstQuestionId: string;
  calculate: (answers: Record<string, Answer>) => QuoteDetails;
  intro: { emoji: string; title: string; subtitle: string };
}
```

The registry maps a slug to its config — one entry per product (ten today):

```typescript
export const PRODUCTS: Record<string, ProductConfig> = {
  "vacant-home":   { id: "vacant-home",   policyType: "Vacant Home Insurance",   questions: QUESTIONS,           firstQuestionId: FIRST_QUESTION_ID,          calculate: calculateQuote,         intro: { … } },
  "jeweller-block":{ id: "jeweller-block",policyType: "Jeweller Block Insurance",questions: JEWELLER_QUESTIONS,  firstQuestionId: JEWELLER_FIRST_QUESTION_ID, calculate: calculateJewellerQuote, intro: { … } },
  // …rental-home, farm, cyber-liability, contractor, architects-engineers,
  //   retailers, personal-items, lithium-batteries…
};

export const DEFAULT_PRODUCT_ID = "vacant-home";
```

The shared engine starts at `firstQuestionId`, walks the question array via routing rules until it hits `"__SUBMIT__"`, then calls `calculate(answers)` to produce the quote. `policyType` is written to the database and shown on the result screen and PDF.

> **Routing safety net.** `src/data/_allProductsRouting.test.ts` runs under `npm test` and validates **every** registered product: every `defaultNextQuestionId` / branch target resolves to a real id or `"__SUBMIT__"`, every question is reachable from the first question, `"__SUBMIT__"` is reachable, and ids are unique. If you mistype a `nextQuestionId` or orphan a question, this test fails — so run `npm test` after editing any flow.

---

## Excel Sheet Layout (Recommended)

Structure your Excel workbook with the following tabs. (Keep one workbook per product.)

### Tab 1 — "Questions"

| Col | Field | Notes |
|---|---|---|
| A | `id` | unique snake_case |
| B | `type` | choice / text / number / currency / toggle / dropdown / address / date |
| C | `brokerText` | what Alex asks; supports `{{answer_id}}` |
| D | `helperText` | optional hint |
| E | `defaultNextQuestionId` | next question, or `__SUBMIT__` |
| F | `options` (JSON) | for choice / toggle / dropdown |
| G | `conditionalBranches` (JSON) | branching logic |
| H | `underwritingRules` (JSON) | decline / refer triggers |
| I | `ratingFactor` | key used in the calculator |
| J | `summaryLabel` / `summarySection` | short label + section grouping |

### Tab 2 — "Rating Factors"

| Factor Name | Answer Value | Multiplier |
|---|---|---|
| Province | ON | 1.12 |
| Vacancy Duration | 0-6m | 1.00 |
| … | … | … |

### Tab 3 — "UW Rules" (optional — for documentation)

Keep a plain-English version of all decline/refer rules for underwriter review. This does NOT feed the app directly — you translate these into the `underwritingRules` arrays in Tab 1.

---

## The Question Object — Every Field Explained

Each question is a TypeScript object conforming to the `Question` interface. Below is **every** field. Only `id`, `type`, and `brokerText` are required; the rest are optional and apply to specific input types.

```typescript
{
  // ── ALWAYS REQUIRED ─────────────────────────────────────────
  id: "vacancy_duration",
  // Unique snake_case key. Used in the answers map, in {{interpolation}},
  // in conditionalBranches, and (for vacant-home) in the section map. (Col A)

  type: "choice",
  // The input widget. See "Input Types" below. (Col B)

  brokerText: "How long has the property been vacant?",
  // What Alex "says" in a chat bubble. Supports {{answer_id}}. (Col C)

  // ── OPTIONAL — GENERAL ──────────────────────────────────────
  helperText: "This affects your rate significantly.",
  // Small grey hint under the input. (Col D)

  placeholder: "e.g. 1985",
  // Placeholder text inside text/number/currency/address inputs.

  defaultNextQuestionId: "vacancy_reason",
  // Where to go next unless a conditionalBranch overrides it.
  // Use "__SUBMIT__" to end the questionnaire. (Col E)

  options: [ { label: "Under 6 months", value: "0-6m", emoji: "📅" } ],
  // Required for choice / toggle / dropdown. See "Options". (Col F)

  conditionalBranches: [ … ],
  // Routing overrides, evaluated before defaultNextQuestionId. (Col G)

  underwritingRules: [ … ],
  // Decline / refer triggers, evaluated at final underwriting. (Col H)

  ratingFactor: "vacancyDuration",
  // Key the calculator uses to look up this answer's multiplier.
  // Leave unset if the question has no pricing effect. (Col I)

  required: true,
  // If true, the submit button stays disabled until the field is filled.

  // ── NUMBER / CURRENCY INPUTS ────────────────────────────────
  min: 1800,           // Minimum accepted value
  max: 2025,           // Maximum accepted value
  prefix: "$",         // Shown before the input (e.g. dollar sign)
  suffix: "sq ft",     // Shown after the input (e.g. a unit label)
  mustBeInteger: true, // number only: reject decimals
  noGrouping: true,    // number only: no thousands separator (use for years)

  // ── TEXT INPUTS ─────────────────────────────────────────────
  inputType: "name",   // "email" | "name" | "phone" | "text" — drives validation
  minLength: 2,        // Minimum character count
  maxLength: 40,       // Maximum character count

  // ── SUMMARY / PDF PRESENTATION ──────────────────────────────
  summaryLabel: "Vacancy",   // Short label in summary/detail/PDF views
  summarySection: "Vacancy", // Groups answers under a section heading
}
```

> There is no `description` field on a question — `description` lives on each **option** (see below).

---

## Input Types — Choosing the Right One

The `type` field is a `QuestionType`:

| `type` value | Widget rendered | Use when… |
|---|---|---|
| `"choice"` | Grid of large tappable buttons | 2–6 pre-set options; options are the answer |
| `"toggle"` | Two full-width buttons side by side | Exactly 2 options, typically Yes / No |
| `"text"` | Single-line text field | Name, email, phone, any free-form string (pair with `inputType`) |
| `"number"` | Numeric field with min/max | Year built, square footage, years in business |
| `"currency"` | `$`-prefixed field, auto-formats with commas | Replacement cost, sum insured, any dollar figure |
| `"dropdown"` | Searchable select list | Long lists (provinces, etc.) |
| `"address"` | Google Places autocomplete + map preview | Street address (see Special Inputs) |
| `"date"` | Native date picker | Dates — policy start, date purchased, etc. |

**Rule of thumb:** use `choice` with ≤ 6 options for big tappable buttons; switch to `dropdown` for long lists.

---

## Options — Formatting the Answer Choices

Options are an array of `Option` objects. Only `label` and `value` are required.

```typescript
options: [
  { label: "Single Family Home", value: "single_family", emoji: "🏠" },
  { label: "Condo / Apartment",  value: "condo", emoji: "🏢", description: "Unit in a multi-unit building" },
]
```

| Field | Required | Description |
|---|---|---|
| `label` | Yes | Text shown on the button. Keep it short (≤ 30 chars). |
| `value` | Yes | The value saved internally — a `string` **or** a `number`. |
| `emoji` | No | Displayed above the label on `choice` buttons. |
| `description` | No | Small sub-label below the main label. Good for explaining trade-offs. |

**Important:** `value` is what conditional branches, underwriting rules, and rating-factor tables compare against — not `label`. Keep values stable even if you rename labels.

**String vs number values matter.** Note how `prior_claims` mixes them: `value: 0`, `value: 1`, `value: 2` are numbers, but `value: "3+"` is a string. Your branches, UW rules, and factor tables must match the exact type (`equals` is type-sensitive — see operators below).

---

## Conditional Branching — Routing Between Questions

`defaultNextQuestionId` is the fallback. `conditionalBranches` overrides it: branches are evaluated **in order, first match wins**, and only if none match does the default apply.

### Basic branch: if the answer to THIS question equals X, go to Y

```typescript
// has_pool → only ask pool_fenced when there's a pool
conditionalBranches: [
  { when: { operator: "equals", value: "yes" }, nextQuestionId: "pool_fenced" },
]
```

When `when.questionId` is omitted, the branch tests the **current** question's answer.

### Cross-question branch: test a DIFFERENT earlier answer

Set `when.questionId` to look back at any already-answered question. This is how the vacant flow scales claim-detail questions to the claim count:

```typescript
// On claim_1_cause: only continue to claim_2_cause if the
// earlier prior_claims answer was 2 or "3+"
conditionalBranches: [
  { when: { questionId: "prior_claims", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
  { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
]
```

### Multiple branches (first match wins)

```typescript
conditionalBranches: [
  { when: { operator: "equals", value: 1 },    nextQuestionId: "claim_1_cause" },
  { when: { operator: "equals", value: 2 },    nextQuestionId: "claim_1_cause" },
  { when: { operator: "equals", value: "3+" }, nextQuestionId: "claim_1_cause" },
  // none matched → defaultNextQuestionId is used
]
```

### Supported Operators (`ComparisonOperator`)

| Operator | Example `value` | Notes |
|---|---|---|
| `"equals"` | `"yes"`, `1` | Exact match. Type-sensitive: `"1"` ≠ `1`. |
| `"not_equals"` | `"no"` | Matches anything except the given value. |
| `"greater_than"` | `1900` | Numeric. |
| `"less_than"` | `1` | Numeric. |
| `"greater_than_or_equal"` | `80` | Numeric. |
| `"less_than_or_equal"` | `100` | Numeric. |
| `"contains"` | `"fire"` | Case-insensitive substring match. |
| `"in_list"` | `["NT","NU","YT"]` | `value` is an array; matches if the answer is in it. |

### Special destination IDs

| Value | Meaning |
|---|---|
| `"__SUBMIT__"` | Ends the questionnaire and runs the calculator → result screen |
| Any `question.id` | Jumps to that question |

---

## Underwriting Rules — Decline and Refer Triggers

`underwritingRules` fire **all at once** at final underwriting (when the flow submits) — not question by question. They use the same operators as branches.

```typescript
// On vacancy_duration:
underwritingRules: [
  { operator: "equals", value: "5y+", decision: "decline",
    message: "Properties vacant for more than 5 years fall outside our underwriting guidelines." },
  { operator: "equals", value: "3-5y", decision: "refer",
    message: "Properties vacant between 3–5 years require individual underwriter review." },
]
```

| Field | Description |
|---|---|
| `operator` | A `ComparisonOperator` (same set as branches) |
| `value` | The threshold to compare the answer against (`string`/`number`/`boolean`/`string[]`) |
| `decision` | `"decline"` — reject; `"refer"` — send to a human underwriter |
| `message` | Plain-English text shown to the user on the Decline / Refer screen |

A rule with `operator: "in_list"` checks membership, e.g. the province rule declines/refers `["NT","NU","YT"]`.

### Priority

If a run produces both decline and refer triggers, **decline wins**. Decline reasons are shown together; refer reasons are shown only when there are no declines.

### Best practices for messages

- Decline with empathy: *"Unfortunately, this property falls outside our underwriting guidelines."*
- Refer with reassurance: *"A specialist will review this and contact you within one business day."*
- No technical jargon or internal codes — users read these directly.

---

## Rating Factors — Linking Questions to Pricing

The `ratingFactor` field is a string key. The product's calculator (`quoteCalculator.ts` for vacant-home, `jewellerQuoteCalculator.ts` for jeweller, `<product>QuoteCalculator.ts` for the rest) reads the answer, looks it up in a factor table, and applies the multiplier.

### The calculator pattern (shared by every product)

Every `calculate(answers)` follows the same shape:

```typescript
export function calculateExampleQuote(answers: Record<string, Answer>): QuoteDetails {
  const uwDecision = runUnderwritingEngine(answers, EXAMPLE_QUESTIONS); // decline/refer arrays
  const factors: FactorBreakdown[] = [];
  let flatTotal = 0;

  // Base premium is product-specific — sum insured / coverage limit / revenue driven.
  const basePremium = …;
  let premium = basePremium;

  // Each multiplier is applied and pushed onto the factors breakdown:
  const applyFactor = (name: string, multiplier: number, description: string) => {
    premium *= multiplier;
    factors.push({ name, multiplier, adjustment: 0, description });
  };

  // Optional flat dollar loadings:
  const applyFlat = (name: string, amount: number, description: string) => {
    flatTotal += amount;
    factors.push({ name, multiplier: 1, adjustment: amount, description });
  };

  // …applyFactor(...) per rated question, applyFlat(...) per loading…

  const finalAnnualPremium = Math.round(premium + flatTotal);
  return { ...uwDecision, basePremium, finalAnnualPremium,
           finalMonthlyPremium: Math.round(finalAnnualPremium / 12),
           coverageAmount: …, deductible: …, factors };
}
```

So the underwriting decision and the pricing run in the same call: `runUnderwritingEngine(answers, QUESTIONS)` produces the decision arrays, then `applyFactor` walks the rated questions.

### Step 1 — name the factor on the question

```typescript
{ id: "property_type", /* … */ ratingFactor: "propertyType" }
```

### Step 2 — add the table to the product's rating-factors file

Two table shapes are used:

**Lookup tables** (`Record<value, multiplier>`) for choice/toggle/dropdown answers:

```typescript
export const PROPERTY_TYPE_FACTORS: Record<string, number> = {
  single_family: 1.00,
  townhouse:     0.95,
  condo:         0.88,
  multi_family:  1.20,
  mobile:        0.00, // DECLINE — never actually priced
};
```

**Functions** for continuous numeric inputs:

```typescript
export function getYearBuiltFactor(yearBuilt: number): number {
  const age = new Date().getFullYear() - yearBuilt;
  if (age <= 10) return 0.95;
  if (age <= 25) return 1.00;
  if (age <= 50) return 1.10;
  if (age <= 75) return 1.25;
  return 1.45;
}
```

### Step 3 — apply it in the calculator

```typescript
const t = String(answers.property_type?.value ?? "single_family");
applyFactor("Property Type", PROPERTY_TYPE_FACTORS[t] ?? 1.0, answers.property_type?.displayValue ?? "");
```

### Base premium and flat loadings

Each product has its own base figure, set in its `*RatingFactors.ts`. The driver varies by product: vacant-home uses a flat `BASE_PREMIUM = 500` (CAD); jeweller uses `JEWELLER_BASE_RATE = 0.01` applied to the **sum insured** (max stock value); other products are driven by a coverage **limit**, **revenue/turnover**, or scheduled item value. After multipliers, **flat dollar loadings** are added, e.g.:

```typescript
export const FLAT_ADJUSTMENTS = {
  unfenced_pool:      200,
  has_damage:         150,
  no_prior_insurance: 100,
  utilities_active:    75,
};
```

### Factor conventions

| Value | Meaning |
|---|---|
| `1.00` | No change — base/neutral rate |
| `> 1.00` | Surcharge (`1.25` = +25%) |
| `< 1.00` | Discount (`0.90` = −10%) |
| `0.00` | Should never reach the calculator — paired with a decline rule |

---

## Summary & Sections — summaryLabel / summarySection

After submission, answers are shown grouped into sections on the summary screen, the detail page, the progress rail, and the PDF. Two fields control this:

- **`summaryLabel`** — a short label for the answer (e.g. `"Max Stock Value"` instead of the full broker question). Falls back to the broker text if unset.
- **`summarySection`** — the section heading the answer is grouped under (e.g. `"Security"`, `"Stock & Coverage"`).

The **jeweller** flow sets `summarySection` directly on each question. The **vacant-home** flow does not — instead `src/utils/sections.ts` holds a `VACANT_SECTION_MAP` from `question.id → section`. The resolver works for both:

```typescript
// src/utils/sections.ts
export function sectionForQuestion(q: Question): string {
  return q.summarySection ?? VACANT_SECTION_MAP[q.id] ?? "Details";
}
```

`orderedSections(questions)` returns the de-duplicated section list in first-seen order, which drives the progress rail. So: for jeweller questions, set `summarySection` on the question; for vacant-home questions, add an entry to `VACANT_SECTION_MAP`. Anything unmapped falls into `"Details"`.

`noGrouping` is unrelated to sections — it only suppresses the thousands separator on a `number` input (used on `year_built` so "1985" doesn't render as "1,985").

---

## Broker Text Interpolation (Using Previous Answers)

Include a previous answer inside any broker message with double curly braces:

```typescript
brokerText: "Great to meet you, {{applicant_name}}! Let's start with the property — what's its full street address?"
```

If the user answered "Sarah" to `applicant_name`, Alex says **"Great to meet you, Sarah! …"**. The placeholder is `{{question_id}}` — use the `id` of any question already answered.

---

## Special Inputs — Address & Phone

**Address (`type: "address"`).** Renders a Google Places autocomplete with a map preview. In the vacant-home flow `property_address` is asked, but `property_province` is **not** shown to the user — it is auto-derived from the selected address and stored under the `property_province` id so the province rating factor, the territory UW rule, and the `province` DB column keep working. (See the note above `property_province` in `questions.ts`.)

**Phone (`type: "text"` + `inputType: "phone"`).** A normal text input whose validation mode is phone-number formatting. The other `inputType` modes are `"name"`, `"email"`, and `"text"`. `inputType` only affects `text` questions.

---

## Worked Example — A Complete Question

### Excel row

| id | type | brokerText | helperText | defaultNext | options | conditionalBranches | underwritingRules | ratingFactor |
|---|---|---|---|---|---|---|---|---|
| `has_pool` | `toggle` | Does the property have a swimming pool? | — | `prior_damage` | Yes / No | (see below) | (none) | — |

### Resulting TypeScript (from `questions.ts`)

```typescript
{
  id: "has_pool",
  type: "toggle",
  brokerText: "Does the property have a swimming pool?",
  options: [
    { label: "Yes, it has a pool", value: "yes" },
    { label: "No pool", value: "no" },
  ],
  defaultNextQuestionId: "prior_damage",
  conditionalBranches: [
    // Only ask about fencing when there IS a pool; otherwise skip ahead.
    { when: { operator: "equals", value: "yes" }, nextQuestionId: "pool_fenced" },
  ],
},
```

The follow-up it routes to carries the pricing + UW weight:

```typescript
{
  id: "pool_fenced",
  type: "toggle",
  brokerText: "Is the pool completely enclosed by a fence or barrier?",
  helperText: "An unsecured pool on a vacant property is a significant liability exposure.",
  options: [
    { label: "Yes — fully fenced / secured", value: "yes" },
    { label: "No — pool is accessible", value: "no" },
  ],
  defaultNextQuestionId: "prior_damage",
  underwritingRules: [
    { operator: "equals", value: "no", decision: "refer",
      message: "An unsecured swimming pool on a vacant property requires underwriter review." },
  ],
  ratingFactor: "pool",
},
```

---

## How to Add a New Question

1. Add the object to the product's question array (`QUESTIONS` or `JEWELLER_QUESTIONS`) at the position you want it in the flow.
2. Point the **previous** question's `defaultNextQuestionId` (and any relevant branches) at your new `id`.
3. Set your new question's `defaultNextQuestionId` to the next question (or `"__SUBMIT__"` if it is last).
4. If it affects pricing: set `ratingFactor`, add a factor table/function to the product's rating-factors file, and apply it in the product's calculator (`?? 1.0` fallback).
5. If it has decline/refer logic: add an `underwritingRules` array.
6. For its summary grouping: set `summarySection` (+ `summaryLabel`) on the question (jeweller style) **or** add an entry to `VACANT_SECTION_MAP` in `src/utils/sections.ts` (vacant style).
7. If it is the new first question, update `FIRST_QUESTION_ID` / `JEWELLER_FIRST_QUESTION_ID`.

---

## How to Add a New Product / Package

1. Create `src/data/<product>Questions.ts` exporting a `Question[]` and a `…_FIRST_QUESTION_ID` constant. Set `summarySection` on each question.
2. Create `src/data/<product>RatingFactors.ts` with a base premium/rate and the factor tables/functions.
3. Create `src/engine/<product>QuoteCalculator.ts` exporting `calculate(answers): QuoteDetails` that returns the full `QuoteDetails` (base premium, factors, final annual/monthly premium, coverage, deductible, and the underwriting decision arrays).
4. Register it in `src/data/products.ts`:

```typescript
export const PRODUCTS: Record<string, ProductConfig> = {
  // …existing products…
  "my-product": {
    id: "my-product",
    policyType: "My Product Insurance",
    questions: MY_PRODUCT_QUESTIONS,
    firstQuestionId: MY_PRODUCT_FIRST_QUESTION_ID,
    calculate: calculateMyProductQuote,
    intro: { emoji: "📄", title: "My Product Insurance", subtitle: "One-line pitch shown on the intro screen." },
  },
};
```

5. Reuse the `applicant_name` / `contact_email` ids if you want the persistence layer to map them to the shared Submission columns without special-casing (the jeweller flow does this).
6. Run `npm test`. The new product is automatically picked up by `_allProductsRouting.test.ts`, which checks that all targets resolve, every question is reachable, and `"__SUBMIT__"` is reachable — a fast way to catch a mistyped `nextQuestionId` or an orphaned question.

The shared engine, persistence, and result UI need no other changes — they read everything from the `ProductConfig`. Non-vacant-home products store their answers in the `allAnswers` JSON column, so there are no per-product DB columns to add.

---

## Common Mistakes & How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| Two questions share the same `id` | Answers overwrite each other silently | Every `id` must be unique within the product |
| `conditionalBranch.nextQuestionId` references a missing id | Flow stalls on that answer | Verify every target id exists in the array |
| Numeric vs string `value` mismatch | Branch / UW rule / factor never fires | Match exact types (`value: 1` vs `value: "1"`) |
| `ratingFactor` key has no table/handler in the calculator | Factor silently skipped (no error) | Add the table and the handler |
| Missing `defaultNextQuestionId` on a non-terminal question | Flow stops | Every non-terminal question needs a default next |
| Forgetting `"__SUBMIT__"` on the last question | Flow never submits | Set `defaultNextQuestionId: "__SUBMIT__"` |
| New vacant-home question with no section | Lands in "Details" | Add it to `VACANT_SECTION_MAP` (or set `summarySection`) |
| New jeweller question missing `summarySection` | Lands in "Details" | Set `summarySection` on the question |

---

## Quick Checklist Before Going Live

- [ ] Every question has a unique `id`
- [ ] Every question has a `defaultNextQuestionId` (or `"__SUBMIT__"` if last)
- [ ] All `conditionalBranch.nextQuestionId` values reference real question ids
- [ ] Cross-question branches use the correct `when.questionId` and matching `value` types
- [ ] The first question id matches `FIRST_QUESTION_ID` / `JEWELLER_FIRST_QUESTION_ID`
- [ ] The product is registered in `products.ts` with `policyType`, `questions`, `firstQuestionId`, `calculate`, and `intro`
- [ ] All `ratingFactor` keys have a table/function and a handler in the calculator (with `?? 1.0` fallback)
- [ ] All UW rule `value` types match their option `value` types
- [ ] UW messages are plain, customer-friendly English
- [ ] Every question is grouped into a section (`summarySection` or `VACANT_SECTION_MAP`)
- [ ] You have tested at least one Decline path, one Refer path, and one Accept path per product
