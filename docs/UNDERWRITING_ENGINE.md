# Underwriting Engine & Quote Calculator

This document explains exactly how the application decides **Accept / Decline / Refer** and how it computes the **final premium**, so you can confidently extend both engines with your own rules and pricing logic.

---

## Table of Contents

1. [Overview — Two Engines, One Pipeline](#overview--two-engines-one-pipeline)
2. [The Underwriting Engine](#the-underwriting-engine)
   - [How It Works](#how-it-works)
   - [Decision Priority](#decision-priority)
   - [Adding a New Rule](#adding-a-new-rule)
3. [The Quote Calculator](#the-quote-calculator)
   - [The Pricing Formula](#the-pricing-formula)
   - [Step-by-Step Walkthrough](#step-by-step-walkthrough)
   - [Adding a New Rating Factor](#adding-a-new-rating-factor)
4. [Rating Factor Reference](#rating-factor-reference)
5. [The Outcome Screens](#the-outcome-screens)
6. [Testing the Engines](#testing-the-engines)
7. [Worked Examples](#worked-examples)

---

## Overview — Two Engines, One Pipeline

When the user clicks **"Calculate My Quote"** on the Summary screen, `QuoteContext.confirmSummary()` calls a single function:

```typescript
const result = calculateQuote(answers);
```

Inside `calculateQuote`, two things happen in sequence:

```
calculateQuote(answers)
  │
  ├─ 1. runUnderwritingEngine(answers)
  │        └─ Returns { decision, declineReasons, referralReasons }
  │
  └─ 2. Apply all rating factors to BASE_PREMIUM
           └─ Returns finalAnnualPremium, finalMonthlyPremium, factors[]
```

The underwriting decision and the calculated premium are bundled together into a `QuoteDetails` object, which `QuoteResult.tsx` uses to render the correct outcome screen.

---

## The Underwriting Engine

**File:** `src/engine/underwritingEngine.ts`

### How It Works

The engine iterates over every question that has an `underwritingRules` array. For each rule, it checks whether the user's answer meets the rule's condition using the `compare()` function.

```typescript
function compare(actual, operator, target): boolean {
  // Handles: equals, not_equals, greater_than, less_than,
  //          greater_than_or_equal, less_than_or_equal,
  //          contains, in_list
}
```

If the condition is met, the rule's `message` is added to either `declineReasons` or `referralReasons` depending on its `decision` field.

```typescript
for (const question of QUESTIONS) {
  const answer = answers[question.id];
  for (const rule of question.underwritingRules ?? []) {
    if (compare(answer.value, rule.operator, rule.value)) {
      if (rule.decision === "decline") declineReasons.push(rule.message);
      else                            referralReasons.push(rule.message);
    }
  }
}
```

### Decision Priority

| Condition | Decision returned |
|---|---|
| Any `"decline"` rule fired | `"decline"` — decline reasons shown, refer reasons suppressed |
| Only `"refer"` rules fired | `"refer"` — referral reasons shown |
| No rules fired | `"accept"` — proceed to quote |

**Decline always takes precedence over Refer.** If an application triggers both a decline rule and a refer rule, the applicant sees the Decline screen only.

### Adding a New Rule

All rules live in the `underwritingRules` array of the relevant question in `src/data/questions.ts`. No engine code needs changing.

**Example — decline if property value is under $50,000:**

```typescript
{
  id: "property_value",
  ...
  underwritingRules: [
    // Existing rule
    {
      operator: "greater_than",
      value: 2000000,
      decision: "refer",
      message: "Properties over $2M require senior underwriter approval.",
    },
    // New rule
    {
      operator: "less_than",
      value: 50000,
      decision: "decline",
      message: "The minimum insurable replacement cost is $50,000.",
    },
  ],
}
```

**Example — refer if state is one of a specific set:**

```typescript
underwritingRules: [
  {
    operator: "in_list",
    value: ["LA", "FL", "TX"],
    decision: "refer",
    message: "Gulf Coast properties require additional hurricane risk assessment.",
  },
]
```

---

## The Quote Calculator

**File:** `src/engine/quoteCalculator.ts`

### The Pricing Formula

```
Annual Premium = BASE_PREMIUM
  × state_factor
  × vacancy_duration_factor
  × property_type_factor
  × property_value_factor     (dynamic — scales with dollar amount)
  × year_built_factor         (dynamic — scales with property age)
  × inspection_frequency_factor
  × security_factor
  × prior_claims_factor
  × deductible_factor
  × coverage_percent_factor
  + flat_adjustments          (dollar amounts added after multiplication)
```

**Base premium:** `$500` (defined in `src/data/ratingFactors.ts` as `BASE_PREMIUM`)

All multiplier factors are in `src/data/ratingFactors.ts`. All flat adjustments are in `FLAT_ADJUSTMENTS` in the same file.

### Step-by-Step Walkthrough

Here is what the calculator does for a sample application:

**Input answers:**
- State: Florida (FL)
- Vacancy Duration: 6–12 months
- Property Type: Single Family Home
- Property Value: $350,000
- Year Built: 1990
- Inspection Frequency: Weekly
- Security: Alarm + deadbolts
- Prior Claims: None (0)
- Deductible: $2,500
- Coverage: 100%
- Pool: No

**Calculation:**

| Step | Factor | Value | Running Premium |
|---|---|---|---|
| Start | Base Premium | $500 | $500.00 |
| 1 | State (FL) | × 1.45 | $725.00 |
| 2 | Vacancy Duration (6–12m) | × 1.15 | $833.75 |
| 3 | Property Type (single family) | × 1.00 | $833.75 |
| 4 | Property Value ($350k) | × 1.06 | $883.78 |
| 5 | Year Built (1990 = 35 yrs) | × 1.10 | $972.15 |
| 6 | Inspections (weekly) | × 0.90 | $874.94 |
| 7 | Security (alarm + locks) | × 0.90 | $787.44 |
| 8 | Prior Claims (0) | × 1.00 | $787.44 |
| 9 | Deductible ($2,500) | × 1.00 | $787.44 |
| 10 | Coverage (100%) | × 1.00 | $787.44 |
| 11 | Flat Adjustments | +$0 | $787.44 |
| **Final** | Annual Premium (rounded) | | **$787** |
| Monthly | Annual ÷ 12 | | **$66** |

**Coverage amount:** $350,000 × 100% = $350,000

### Adding a New Rating Factor

**Step 1:** Add a lookup table in `src/data/ratingFactors.ts`

```typescript
// Example: construction material factor
export const CONSTRUCTION_TYPE_FACTORS: Record<string, number> = {
  frame:    1.10,
  masonry:  1.00,
  steel:    0.95,
};
```

**Step 2:** Add the calculation block in `src/engine/quoteCalculator.ts`

Place this block after the existing factor applications, before the flat adjustments:

```typescript
// Construction Type
const constructionType = String(answers.construction_type?.value ?? "masonry");
const ctFactor = CONSTRUCTION_TYPE_FACTORS[constructionType] ?? 1.0;
applyFactor(
  "Construction Type",
  ctFactor,
  answers.construction_type?.displayValue ?? constructionType
);
```

**Step 3:** Import the new table at the top of `quoteCalculator.ts`

```typescript
import {
  // ... existing imports
  CONSTRUCTION_TYPE_FACTORS,
} from "@/data/ratingFactors";
```

**Step 4:** Add `ratingFactor: "constructionType"` to the question in `questions.ts`

The `ratingFactor` string on the question is for documentation only — it does not automatically wire up the calculator. You must add the handler manually (Step 2).

---

## Rating Factor Reference

All factors are defined in `src/data/ratingFactors.ts`.

### State Factors (`STATE_FACTORS`)

Applies a geographic surcharge or discount based on the property state.

| Example State | Factor | Notes |
|---|---|---|
| FL | 1.45 | High hurricane and sinkhole exposure |
| LA | 1.35 | Flood and storm exposure |
| CA | 1.30 | Earthquake and wildfire exposure |
| TX | 1.15 | Hail and wind exposure |
| OH | 1.00 | Base/neutral state |
| IA | 0.90 | Low risk, sparsely populated |

### Vacancy Duration Factors (`VACANCY_DURATION_FACTORS`)

Longer vacancy = more risk of undetected damage, vandalism, and weather events.

| Duration | Factor |
|---|---|
| Under 6 months | 1.00 (base) |
| 6–12 months | 1.15 |
| 1–3 years | 1.35 |
| 3–5 years | 1.60 |
| 5+ years | 0.00 (DECLINE — handled by UW engine, never reaches here) |

### Property Value Factor (`getPropertyValueFactor`)

A dynamic function rather than a lookup table. Scales from $250,000 (1.00×) upward:

```typescript
factor = 1 + Math.max(0, (value - 250_000) / 250_000) × 0.15
```

| Property Value | Factor |
|---|---|
| $100,000 | 1.00 (floors at base) |
| $250,000 | 1.00 (base) |
| $500,000 | 1.15 |
| $750,000 | 1.30 |
| $1,000,000 | 1.45 |

### Year Built Factor (`getYearBuiltFactor`)

Older properties have more systems failures, outdated wiring, and dated materials.

| Age | Factor |
|---|---|
| ≤ 10 years | 0.95 (new build discount) |
| 11–25 years | 1.00 (base) |
| 26–50 years | 1.10 |
| 51–75 years | 1.25 |
| 76+ years | 1.45 |

### Inspection Frequency Factors

Frequent check-ins catch problems before they become major claims.

| Frequency | Factor |
|---|---|
| Weekly or more | 0.90 (10% discount) |
| Every 2–4 weeks | 1.00 (base) |
| A few times a year | 1.15 |
| Rarely / Never | 1.35 |

### Security Factors

A monitored alarm system significantly reduces theft and vandalism claims.

| Security Level | Factor |
|---|---|
| Alarm + deadbolts | 0.90 (10% discount) |
| Deadbolts only | 1.00 (base) |
| Basic locks | 1.10 |
| No security | 1.25 |

### Prior Claims Factors

Claims history is one of the strongest predictors of future claims.

| Claims (5 years) | Factor |
|---|---|
| 0 | 1.00 |
| 1 | 1.10 |
| 2 | 1.25 |
| 3 or more | 1.50 |

### Deductible Factors

Higher deductible = policyholder absorbs more first-dollar loss = lower premium.

| Deductible | Factor |
|---|---|
| $1,000 | 1.10 (lower ded = higher premium) |
| $2,500 | 1.00 (base) |
| $5,000 | 0.90 |
| $10,000 | 0.80 |

### Flat Adjustments (`FLAT_ADJUSTMENTS`)

Applied as a fixed dollar amount after all multipliers, before rounding.

| Condition | Amount | Why |
|---|---|---|
| Unfenced pool | +$200 / year | High liability exposure |
| Known existing damage | +$150 / year | Higher expected claim |
| No prior / lapsed insurance | +$100 / year | Adverse selection signal |
| Active utilities (not winterized) | +$75 / year | Freeze / water damage risk |

---

## The Outcome Screens

`QuoteResult.tsx` reads `quoteDetails.decision` and renders one of three sub-components:

### AcceptResult

Shows:
- Monthly premium (large, prominent)
- Annual premium
- Coverage amount, deductible, term
- Factor breakdown table (what drove the price up or down)
- "Buy This Policy" CTA button (wire this to your payment/bind flow)

### DeclineResult

Shows:
- Empathetic heading ("We're unable to offer coverage")
- All `declineReasons` in red information boxes
- Support email address
- "Try a different property" button

### ReferResult

Shows:
- Reassuring heading ("A specialist will be in touch")
- The user's email address (from `contact_email` answer)
- "What happens next" checklist (email confirmation, call within 1 business day)
- Expandable "Why was this referred?" section showing `referralReasons`
- "Get a quote for a different property" button

---

## Testing the Engines

Because the engines are pure TypeScript functions, you can test them without running the UI.

### Manual test in the browser console

While running `npm run dev`, open the browser console and test directly:

```javascript
// You can't call the TS functions directly in the browser,
// but you can trigger specific paths by answering questions
// in a certain way.
```

### Trigger each outcome deliberately

| To test... | Answer these questions with... |
|---|---|
| **Decline** | Vacancy duration = "More than 5 years" |
| **Decline** | State = "HI" or "AK" |
| **Decline** | Property type = "Mobile / Manufactured" |
| **Refer** | Inspection frequency = "Rarely / Never" |
| **Refer** | Security = "No security measures" |
| **Refer** | Year built < 1900 |
| **Accept** | All answers within normal parameters |

### High-premium vs low-premium

| For a high premium... | For a low premium... |
|---|---|
| State: FL or LA | State: IA or ND |
| Vacancy: 1–3 years | Vacancy: Under 6 months |
| Old property (1890s) | New property (2015+) |
| No security measures | Alarm + deadbolts |
| 3+ prior claims | No prior claims |
| $10,000 property value | $1,000,000 property value |

---

## Worked Examples

### Example 1 — Clean Accept

**Profile:** Recently listed Florida home, built 2010, $300k value, weekly checks, alarm system, no claims, no pool, $2,500 deductible, 100% coverage.

**UW Result:** Accept (no rules triggered)

**Estimated premium:** ~$870/year (~$72/month)

Key drivers: FL state factor (+45%), recent build discount (−5%), alarm discount (−10%)

---

### Example 2 — Decline

**Profile:** California home, vacant for 7 years.

**UW Result:** Decline

**Message shown:** *"Properties vacant for more than 5 years cannot be covered under our program."*

No premium calculated.

---

### Example 3 — Refer (multiple flags)

**Profile:** Ohio home, built 1885, no inspections, active utilities, prior water damage.

**UW Result:** Refer

**Referral reasons shown:**
1. Properties built before 1900 require senior underwriter review.
2. Properties with no regular inspections require underwriter review.
3. Active utilities in a vacant property elevate freeze and water damage risk.
4. Significant existing damage requires underwriter review before binding.

No premium calculated — underwriter calls within 1 business day.
