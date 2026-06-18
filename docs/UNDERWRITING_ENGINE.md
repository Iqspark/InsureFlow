# Underwriting Engine & Quote Calculators

This document explains exactly how the application decides **Accept / Decline / Refer** and how it computes the **final premium** for each product, so you can confidently extend the engine with your own rules and pricing logic. All dollar amounts are in Canadian dollars (CAD).

InsureFlow ships **several products** — including **Vacant Home Insurance**, **Jeweller's Block Insurance**, and **Farm Insurance** (plus Cyber, Contractor, Architects & Engineers, Retailers, Rental Home, Personal Items, and Lithium Batteries). All share a single underwriting engine and a common result UI; each plugs in its own question flow and its own quote calculator via the product registry in `src/data/products.ts`. The worked examples below focus on Vacant Home and Jeweller's Block, but the same mechanics apply to every product.

> **AI underwriter recommendation (advisory):** for *referred* quotes, an underwriter can request an AI verdict (approve/decline + confidence + reasons) via `POST /api/submissions/[id]/ai-review`. This is advisory only — it pre-fills the review note and the human still decides. The engine is pluggable (`src/lib/aiUnderwriter.ts`), currently an inline OpenAI call. It does **not** change the deterministic rule-based engine documented here.

---

## Table of Contents

1. [Overview — One Engine, Two Products](#overview--one-engine-two-products)
2. [The Underwriting Engine](#the-underwriting-engine)
   - [How It Works](#how-it-works)
   - [Comparison Operators](#comparison-operators)
   - [Decision Priority](#decision-priority)
   - [Adding a New Rule](#adding-a-new-rule)
3. [Vacant Home — Quote Calculator](#vacant-home--quote-calculator)
   - [The Pricing Formula](#the-pricing-formula)
   - [Step-by-Step Walkthrough](#step-by-step-walkthrough)
   - [Rating Factor Reference](#rating-factor-reference)
4. [Vacant Home — Underwriting Rules](#vacant-home--underwriting-rules)
   - [Claim-Detail Follow-Ups](#claim-detail-follow-ups)
5. [Jeweller's Block — Quote Calculator](#jewellers-block--quote-calculator)
   - [The Pricing Formula](#the-pricing-formula-1)
   - [Rating Factor Reference](#rating-factor-reference-1)
6. [Jeweller's Block — Underwriting Rules](#jewellers-block--underwriting-rules)
7. [The Outcome Screens](#the-outcome-screens)
8. [Adding a New Rating Factor](#adding-a-new-rating-factor)
9. [Worked Examples](#worked-examples)

---

## Overview — One Engine, Two Products

Each product is registered in `src/data/products.ts` as a `ProductConfig` that bundles its `questions` array, its `firstQuestionId`, and a `calculate` function:

| Product | Questions | Calculator |
|---|---|---|
| Vacant Home (`vacant-home`) | `src/data/questions.ts` | `calculateQuote` |
| Jeweller's Block (`jeweller-block`) | `src/data/jewellerQuestions.ts` | `calculateJewellerQuote` |

When the user clicks **"Calculate My Quote"** on the Summary screen, the selected product's `calculate(answers)` runs. Inside it, two things happen in sequence:

```
calculate(answers)
  │
  ├─ 1. runUnderwritingEngine(answers, questions)
  │        └─ Returns { decision, declineReasons, referralReasons }
  │
  └─ 2. Apply all rating factors to the base premium
           └─ Returns finalAnnualPremium, finalMonthlyPremium, factors[]
```

The underwriting decision and the calculated premium are bundled together into a `QuoteDetails` object, which `QuoteResult.tsx` uses to render the correct outcome screen. The engine is identical for both products — only the `questions` array (and therefore its `underwritingRules`) differs.

---

## The Underwriting Engine

**File:** `src/engine/underwritingEngine.ts`

### How It Works

`runUnderwritingEngine(answers, questions)` takes the collected answers and a **questions array** (defaulting to the vacant-home `QUESTIONS`; the jeweller calculator passes `JEWELLER_QUESTIONS`). It iterates over every question that has an `underwritingRules` array, and for each rule checks whether the user's answer meets the rule's condition using the internal `compare()` function.

```typescript
export function runUnderwritingEngine(
  answers: Record<string, Answer>,
  questions: Question[] = QUESTIONS
): UnderwritingDecision {
  for (const question of questions) {
    if (!question.underwritingRules?.length) continue;
    const answer = answers[question.id];
    if (answer === undefined) continue;        // skipped/unreached questions are ignored
    for (const rule of question.underwritingRules) {
      if (compare(answer.value, rule.operator, rule.value)) {
        if (rule.decision === "decline") declineReasons.push(rule.message);
        else                             referralReasons.push(rule.message);
      }
    }
  }
  // ...decision priority below
}
```

A question whose answer is `undefined` (because the branch was never reached) is skipped — its rules cannot fire.

### Comparison Operators

`compare(actual, operator, target)` supports the full `ComparisonOperator` union:

| Operator | Logic |
|---|---|
| `equals` | `actual === target` (strict) |
| `not_equals` | `actual !== target` (strict) |
| `greater_than` | `Number(actual) > Number(target)` |
| `less_than` | `Number(actual) < Number(target)` |
| `greater_than_or_equal` | `Number(actual) >= Number(target)` |
| `less_than_or_equal` | `Number(actual) <= Number(target)` |
| `contains` | `String(actual).toLowerCase()` includes `String(target).toLowerCase()` |
| `in_list` | `target` is an array and includes `actual` |

> Note: `equals` / `not_equals` are strict. A choice option whose `value` is the number `2` will **not** equal the string `"2"`. Match the option's declared `value` type in your rule.

### Decision Priority

| Condition | Decision returned |
|---|---|
| Any `"decline"` rule fired | `"decline"` — decline reasons shown, refer reasons suppressed |
| Only `"refer"` rules fired | `"refer"` — referral reasons shown |
| No rules fired | `"accept"` — proceed to quote |

**Decline always takes precedence over Refer.** If an application triggers both a decline rule and a refer rule, the applicant sees the Decline screen only (the engine returns `referralReasons: []` in that case).

### Adding a New Rule

All rules live in the `underwritingRules` array of the relevant question in the product's question file (`src/data/questions.ts` or `src/data/jewellerQuestions.ts`). No engine code needs changing.

**Example — decline if replacement cost is under $50,000:**

```typescript
{
  id: "property_value",
  ...
  underwritingRules: [
    {
      operator: "greater_than",
      value: 3000000,
      decision: "refer",
      message: "Properties with a replacement cost exceeding $3,000,000 CAD require senior underwriter approval.",
    },
    {
      operator: "less_than",
      value: 50000,
      decision: "decline",
      message: "The minimum insurable replacement cost is $50,000 CAD.",
    },
  ],
}
```

**Example — refer if province is one of a specific set:**

```typescript
underwritingRules: [
  {
    operator: "in_list",
    value: ["NT", "NU", "YT"],
    decision: "refer",
    message: "Properties in the Northern Territories and Nunavut require individual underwriter review.",
  },
]
```

---

## Vacant Home — Quote Calculator

**File:** `src/engine/quoteCalculator.ts` · **Factors:** `src/data/ratingFactors.ts`

### The Pricing Formula

```
Annual Premium = BASE_PREMIUM
  × province_factor
  × vacancy_duration_factor
  × property_type_factor
  × property_value_factor       (dynamic — scales with dollar amount)
  × year_built_factor           (dynamic — scales with property age)
  × inspection_frequency_factor
  × security_factor
  × prior_claims_factor
  × deductible_factor
  × coverage_percent_factor
  + flat_adjustments            (dollar amounts added after multiplication)

Coverage Amount = property_value × (coverage_percent / 100)
```

**Base premium:** `BASE_PREMIUM = $500` (in `src/data/ratingFactors.ts`). All multiplier factors and the `FLAT_ADJUSTMENTS` table live in the same file. The monthly premium is the rounded annual ÷ 12.

### Step-by-Step Walkthrough

**Input answers:** Province ON · Vacancy 6–12 months · Single Family · Replacement cost $350,000 · Built 1990 · Inspections weekly · Alarm + deadbolts · Claims 0 · Deductible $2,500 · Coverage 100%.

| Step | Factor | Value | Running Premium |
|---|---|---|---|
| Start | Base Premium | $500.00 | $500.00 |
| 1 | Province (ON) | × 1.12 | $560.00 |
| 2 | Vacancy Duration (6–12m) | × 1.15 | $644.00 |
| 3 | Property Type (single family) | × 1.00 | $644.00 |
| 4 | Replacement Cost ($350k = baseline) | × 1.00 | $644.00 |
| 5 | Property Age (built 1990) | × 1.10 | $708.40 |
| 6 | Inspections (weekly) | × 0.90 | $637.56 |
| 7 | Security (alarm + locks) | × 0.90 | $573.80 |
| 8 | Claims History (0) | × 1.00 | $573.80 |
| 9 | Deductible ($2,500) | × 1.00 | $573.80 |
| 10 | Coverage (100%) | × 1.00 | $573.80 |
| 11 | Flat Adjustments | +$0 | $573.80 |
| **Final** | Annual Premium (rounded) | | **$574** |
| Monthly | Annual ÷ 12 | | **$48** |

**Coverage amount:** $350,000 × 100% = $350,000

### Rating Factor Reference

All factors are in `src/data/ratingFactors.ts`.

**Province (`PROVINCE_FACTORS`)** — geographic surcharge/discount, keyed by the auto-derived `property_province`:

| Province | Factor | | Province | Factor |
|---|---|---|---|---|
| BC | 1.20 | | QC | 1.10 |
| AB | 1.05 | | NS / NL | 1.08 |
| ON | 1.12 | | MB / NB / SK | 1.00 |
| YT | 1.25 | | PE | 0.95 |
| NT | 1.30 | | NU | 1.35 |

(NT, NU, YT also trigger a REFER.)

**Vacancy Duration (`VACANCY_DURATION_FACTORS`):**

| Duration | Factor |
|---|---|
| Under 6 months (`0-6m`) | 1.00 (base) |
| 6–12 months (`6-12m`) | 1.15 |
| 1–3 years (`1-3y`) | 1.35 |
| 3–5 years (`3-5y`) | 1.60 (also REFER) |
| 5+ years (`5y+`) | 0.00 — DECLINE, never reaches the calculator |

**Property Type (`PROPERTY_TYPE_FACTORS`):** single family 1.00 · townhouse 0.95 · condo 0.88 · multi-family 1.20 · mobile 0.00 (DECLINE).

**Replacement Cost (`getPropertyValueFactor`)** — dynamic, scaling from a $350,000 baseline:

```typescript
factor = 1 + Math.max(0, (value - 350_000) / 350_000) × 0.12
```

| Replacement Cost | Factor |
|---|---|
| ≤ $350,000 | 1.00 (floors at base) |
| $700,000 | 1.12 |
| $1,050,000 | 1.24 |

**Property Age (`getYearBuiltFactor`)** — age = current year − year built:

| Age | Factor |
|---|---|
| ≤ 10 yrs | 0.95 |
| 11–25 yrs | 1.00 |
| 26–50 yrs | 1.10 |
| 51–75 yrs | 1.25 |
| 76+ yrs | 1.45 |

**Inspection Frequency:** weekly 0.90 · monthly 1.00 · occasional 1.15 · rarely 1.35 (also REFER).

**Security:** alarm + locks 0.90 · locks only 1.00 · basic 1.10 · none 1.25 (also REFER).

**Prior Claims:** 0 → 1.00 · 1 → 1.10 · 2 → 1.25 · `3+` → 1.50 (also REFER).

**Deductible:** $1,000 → 1.10 · $2,500 → 1.00 · $5,000 → 0.90 · $10,000 → 0.80.

**Coverage Percent:** 100% → 1.00 · 90% → 0.92 · 80% → 0.82.

**Flat Adjustments (`FLAT_ADJUSTMENTS`)** — added after all multipliers, before rounding:

| Condition (answers) | Amount |
|---|---|
| `has_pool = yes` **and** `pool_fenced = no` | +$200 / yr |
| `prior_damage = yes` | +$150 / yr |
| `prior_insurance = no` | +$100 / yr |
| `utilities_winterized = no` | +$75 / yr |

---

## Vacant Home — Underwriting Rules

Defined inline on each question in `src/data/questions.ts`:

| Question | Trigger | Decision |
|---|---|---|
| `property_province` (auto-derived) | in NT / NU / YT | refer |
| `property_type` | mobile / manufactured | **decline** |
| `year_built` | before 1900 | refer |
| `property_value` | over $3,000,000 | refer |
| `vacancy_duration` | more than 5 years (`5y+`) | **decline** |
| `vacancy_duration` | 3–5 years (`3-5y`) | refer |
| `property_inspections` | rarely / never | refer |
| `utilities_winterized` | no (active utilities) | refer |
| `security_features` | none | refer |
| `pool_fenced` | no (unsecured pool) | refer |
| `damage_type` | major structural / fire / water | refer |
| `prior_claims` | 3 or more (`3+`) | refer |
| `claim_1/2/3_cause` | fire / smoke | refer |
| `claims_repaired` | no (repairs outstanding) | refer |
| `claims_largest_amount` | over $50k (`over_50k`) | refer |
| `prior_insurance` | no (coverage lapse) | refer |

> `property_province` is **not asked** in the conversation — it is auto-derived from the selected address (`AddressInput`). It remains in the `QUESTIONS` array so its rating factor, its territory REFER rule, and the `province` DB column keep working off the derived answer.

### Claim-Detail Follow-Ups

When the applicant reports one or more prior claims, the flow branches into a set of follow-up questions before continuing. `prior_claims` routes by count via `conditionalBranches`, and the `claim_*_cause` questions chain forward by inspecting `prior_claims` again (using `when.questionId` to reference a **different** question's answer):

```
prior_claims = 0     → prior_insurance               (no follow-ups)
prior_claims = 1     → claim_1_cause → claims_repaired → claims_largest_amount → prior_insurance
prior_claims = 2     → claim_1_cause → claim_2_cause → claims_repaired → claims_largest_amount → prior_insurance
prior_claims = "3+"  → claim_1_cause → claim_2_cause → claim_3_cause → claims_repaired → claims_largest_amount → prior_insurance
```

The follow-ups add three independent REFER paths on top of the `3+` count rule:

- **Any** claim cause = fire/smoke → refer (on whichever of `claim_1/2/3_cause` it appears).
- `claims_repaired = no` (repairs still outstanding) → refer.
- `claims_largest_amount = over_50k` → refer.

So a single prior claim can still produce a Refer if it was a fire, is unrepaired, or exceeded $50,000 — even though the count itself (1 or 2) carries no rule. Three or more claims always refer regardless of the follow-up answers.

---

## Jeweller's Block — Quote Calculator

**File:** `src/engine/jewellerQuoteCalculator.ts` · **Factors:** `src/data/jewellerRatingFactors.ts`

### The Pricing Formula

Unlike the vacant-home flat base, the jeweller base premium is **sum-insured driven** — the maximum stock value times a base rate:

```
Base Premium  = round(max_stock_value × JEWELLER_BASE_RATE)   // rate = 0.01 (1% of sum insured)

Annual Premium = Base Premium
  × business_type_factor
  × province_factor
  × years_in_business_factor      (dynamic — by years trading)
  × stock_in_safe_factor
  × safe_rating_factor
  × alarm_factor
  × window_display_factor
  × offsite_value_factor          (only if carries_stock_offsite = yes)
  × prior_losses_factor
  × deductible_factor
  + flat_loadings

Coverage Amount = max_stock_value     (the sum insured itself)
```

The off-premises factor is applied **only** when `carries_stock_offsite = yes`; otherwise that step is skipped entirely.

### Rating Factor Reference

All factors are in `src/data/jewellerRatingFactors.ts`. `JEWELLER_BASE_RATE = 0.01`.

**Business Type:** retail 1.00 · wholesale 1.10 · manufacturer 1.15 · online-only 1.20 (also REFER) · pawnbroker 1.40 (also REFER).

**Province (`JEWELLER_PROVINCE_FACTORS`)** — weighted for metro property-crime / smash-and-grab: BC 1.18 · ON 1.15 · QC 1.12 · AB 1.08 · MB / NS / SK 1.05 · NB / NL 1.00 · PE 0.95 · YT 1.25 · NT 1.30 · NU 1.35 (NT/NU/YT also REFER).

**Years in Business (`getYearsInBusinessFactor`):** < 1 yr → 1.30 (also REFER) · 1–2 yrs → 1.10 · 3–9 yrs → 1.00 · 10+ yrs → 0.92.

**Stock in Safe Overnight:** all 0.85 · most 1.00 · half 1.20 · under_half 1.45 (also REFER) · none 1.60 (also **DECLINE**).

**Safe / Vault Grade:** vault_high 0.80 · rated_safe 0.95 · fire_safe 1.20 · cabinet 1.50 (also REFER) · none 1.70 (also **DECLINE**).

**Burglar Alarm:** central_safe 0.85 · central_premises 1.00 · local_only 1.30 (also REFER) · none 1.60 (also **DECLINE**).

**Window Display Value:** emptied 0.95 · under_10k 1.05 · k10_50 1.20 · over_50k 1.40 (also REFER).

**Off-Premises Value (only when carried off-site):** under_25k 1.05 · k25_100 1.15 · over_100k 1.35 (also REFER).

**Prior Losses (5 yrs):** 0 → 0.95 · 1 → 1.15 · 2 → 1.35 · `3+` → 1.60 (also REFER).

**Deductible:** $2,500 → 1.10 · $5,000 → 1.00 · $10,000 → 0.90 · $25,000 → 0.78.

**Flat Loadings (`JEWELLER_FLAT_ADJUSTMENTS`):**

| Condition (answers) | Amount |
|---|---|
| `window_display_value = over_50k` | +$500 / yr |
| `carries_stock_offsite = yes` | +$250 / yr |

---

## Jeweller's Block — Underwriting Rules

Defined inline in `src/data/jewellerQuestions.ts`. This product has true **declines** as well as refers:

| Question | Trigger | Decision |
|---|---|---|
| `stock_in_safe` | none (nothing secured overnight) | **decline** |
| `safe_rating` | none (no rated safe/vault) | **decline** |
| `alarm_type` | none (no alarm) | **decline** |
| `business_type` | pawnbroker | refer |
| `business_type` | online-only | refer |
| `business_province` | in NT / NU / YT | refer |
| `years_in_business` | under 1 year | refer |
| `max_stock_value` | over $5,000,000 | refer |
| `stock_in_safe` | less than half (`under_half`) | refer |
| `safe_rating` | cabinet/showcase only | refer |
| `alarm_type` | local audible alarm only | refer |
| `window_display_value` | over $50k left in windows | refer |
| `offsite_value` | over $100k carried off-site | refer |
| `prior_losses` | 3 or more (`3+`) | refer |

The three "no overnight safe / no rated safe / no alarm" declines reflect the minimum physical-security bar for a jewellery risk; any one of them outranks every refer via the engine's decline-precedence rule.

---

## The Outcome Screens

`QuoteResult.tsx` reads `quoteDetails.decision` and renders one of three sub-components for either product:

- **AcceptResult** — monthly premium (prominent), annual premium, coverage amount, deductible, term, the factor-breakdown table, and a **Buy This Policy** CTA that sends a confirmation email.
- **DeclineResult** — empathetic heading, every `declineReasons` message, support contact, and a restart button.
- **ReferResult** — reassuring heading, the applicant's email, a "what happens next" checklist, and an expandable "Why was this referred?" section listing `referralReasons`.

---

## Adding a New Rating Factor

The same four steps apply to whichever calculator you are extending.

**1. Add a lookup table** in the product's rating-factors file:

```typescript
export const CONSTRUCTION_TYPE_FACTORS: Record<string, number> = {
  frame: 1.10, masonry: 1.00, steel: 0.95,
};
```

**2. Add the calculation block** in the calculator (after the existing factor applications, before the flat adjustments):

```typescript
const constructionType = String(answers.construction_type?.value ?? "masonry");
applyFactor(
  "Construction Type",
  CONSTRUCTION_TYPE_FACTORS[constructionType] ?? 1.0,
  answers.construction_type?.displayValue ?? constructionType
);
```

**3. Import the new table** at the top of the calculator.

**4. Add `ratingFactor: "constructionType"`** to the question.

> The `ratingFactor` string on a question is **documentation only** — it does not auto-wire the calculator. You must add the handler in step 2 manually.

---

## Worked Examples

### Example 1 — Vacant Home, Clean Accept

**Profile:** Ontario home, built 2015, $300k replacement cost, weekly checks, alarm system, no claims, no pool, $2,500 deductible, 100% coverage, winterized.

**UW Result:** Accept (no rules triggered). Key drivers: ON province (+12%), recent-build discount (−5%), alarm discount (−10%), weekly-inspection discount (−10%).

### Example 2 — Vacant Home, Decline

**Profile:** BC home, vacant for 7 years (`5y+`).

**UW Result:** Decline. *"Properties vacant for more than 5 years fall outside our underwriting guidelines."* No premium calculated.

### Example 3 — Vacant Home, Refer via Claim Details

**Profile:** 1 prior claim, cause = fire, repaired, under $10k.

**UW Result:** Refer. Even though a single claim carries no count rule, the fire cause fires *"A prior fire or smoke loss on the property requires underwriter review."*

### Example 4 — Jeweller's Block, Decline

**Profile:** Retail jeweller, but stock left out overnight (`stock_in_safe = none`).

**UW Result:** Decline. *"Stock left unsecured overnight … falls outside our underwriting appetite."* Even if other answers would only refer, the decline wins.

### Example 5 — Jeweller's Block, Accept

**Profile:** ON retail jeweller, 12 yrs trading, $500k max stock, all in a TL-15 rated safe, central-station alarm with safe contacts, windows emptied nightly, no off-site, no losses, $5,000 deductible.

**UW Result:** Accept. Base premium = $500,000 × 0.01 = $5,000, then reduced by the established-trader, all-in-safe, rated-safe, central-station, and emptied-window discounts.
