# Quick Reference Card

A one-page cheat sheet for the most common tasks. Keep this open when editing the data files.

---

## Demo Login Credentials

```
URL: http://localhost:3000     (all accounts use password: Demo1234!)

Admin        admin@demo.com         → lands on /admin
Underwriter  underwriter@demo.com   → lands on /review
Broker       broker@demo.com        → lands on /dashboard
Broker       harpreet.singh@insureflow.com
```

Run `npm run db:seed` to create these accounts if they don't exist.

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `"file:./prisma/dev.db"` for local dev |
| `NEXTAUTH_SECRET` | Yes | Any long random string (32+ chars) |
| `NEXTAUTH_URL` | Yes | `"http://localhost:3000"` for local dev |
| `OPENAI_API_KEY` | Yes | Powers Help Navigator + change-answer AI |
| `SMTP_HOST` | Optional | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Optional | SMTP port (e.g. `587`) |
| `SMTP_USER` | Optional | SMTP login email |
| `SMTP_PASS` | Optional | SMTP password or App Password |
| `SMTP_FROM` | Optional | Sender display name + address |

> **Email fallback:** If SMTP vars are absent, the app uses Ethereal (free test inbox). A preview URL is returned by the API and shown in the UI.

---

## Knowledge Base — Help Navigator Documents

Drop `.md` or `.txt` files here and they are read automatically on each API call (no restart needed):

```
knowledge/
  general-faq.md   ← already exists (sample FAQ)
  your-faq.md      ← add your own files here
```

---

## Products

Two products are registered in `src/data/products.ts`, each plugging its own questions + calculator into the shared engine and result UI:

| Product | Questions file | Calculator |
|---|---|---|
| Vacant Home (`vacant-home`) | `src/data/questions.ts` | `calculateQuote` |
| Jeweller's Block (`jeweller-block`) | `src/data/jewellerQuestions.ts` | `calculateJewellerQuote` |
| Farm (`farm`) | `src/data/farmQuestions.ts` | `calculateFarmQuote` |
| Cyber / Contractor / AE / Retailers / Rental / Items / Batteries | `src/data/<product>Questions.ts` | `calculate<Product>Quote` |

---

## Adding a New Question

1. Open the relevant product's questions file (`src/data/questions.ts` or `src/data/jewellerQuestions.ts`)
2. Add a new object to the `QUESTIONS` / `JEWELLER_QUESTIONS` array
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
    when: { operator: "equals", value: "yes" },   // tests THIS question's answer
    nextQuestionId: "follow_up_question_id",
  },
],
defaultNextQuestionId: "default_if_no_branch_matches",
```

Branches are checked **in order**; the first match wins. To branch on a *different* question's answer, add `questionId`:

```typescript
conditionalBranches: [
  // Branch this question based on the earlier prior_claims answer
  { when: { questionId: "prior_claims", operator: "equals", value: "3+" },
    nextQuestionId: "claim_3_cause" },
],
```

`questionId` defaults to the current question's `id` when omitted.

---

## Operator Reference

Used by both `underwritingRules` and `conditionalBranches` `when` clauses.

| Operator | Example test | Notes |
|---|---|---|
| `"equals"` | `value === "yes"` | Strict — `2` ≠ `"2"`. Match the option's value type. |
| `"not_equals"` | `value !== "no"` | Strict |
| `"greater_than"` | `value > 1900` | Coerced to Number |
| `"less_than"` | `value < 5` | Coerced to Number |
| `"greater_than_or_equal"` | `value >= 80` | Coerced to Number |
| `"less_than_or_equal"` | `value <= 100` | Coerced to Number |
| `"contains"` | `"fire"` in value | Case-insensitive substring match |
| `"in_list"` | `value: ["NT","NU","YT"]` | True if answer is in the array |

---

## Question Type Reference

| `type` | Best for | Needs `options`? |
|---|---|---|
| `"choice"` | 2–6 button options | Yes |
| `"toggle"` | Yes / No | Yes (exactly 2) |
| `"text"` | Name, email, phone, free text (see `inputType`) | No |
| `"number"` | Year, sq ft, count | No (add `min`/`max`) |
| `"currency"` | Dollar amounts ($ prefix) | No (add `min`/`max`) |
| `"dropdown"` | Many options with search | Yes |
| `"address"` | Google Places autocomplete + map preview | No |
| `"date"` | Calendar date | No |

For `type: "text"`, set `inputType` to drive validation: `"name"`, `"email"`, `"phone"`, or `"text"`.

---

## Question Field Reference

| Field | Applies to | Purpose |
|---|---|---|
| `id` | all | Unique snake_case key; also the answer key |
| `type` | all | One of the Question Types above |
| `brokerText` | all | What "Alex" asks (supports `{{answer_id}}`) |
| `helperText` | all | Subtext hint |
| `placeholder` | text/number/currency/address | Input placeholder |
| `options` | choice/toggle/dropdown | `{ label, value, emoji?, description? }[]` |
| `defaultNextQuestionId` | all | Default routing (`"__SUBMIT__"` ends the flow) |
| `conditionalBranches` | all | Routing overrides; `when` supports optional `questionId` |
| `underwritingRules` | all | Decline/refer triggers (see Operator Reference) |
| `ratingFactor` | all | Doc-only key; does NOT auto-wire the calculator |
| `required` | all | Block until answered |
| `inputType` | text | `"name"` / `"email"` / `"phone"` / `"text"` validation |
| `min` / `max` | number/currency | Value bounds |
| `prefix` / `suffix` | number/currency | e.g. `"$"` / `"sq ft"` |
| `mustBeInteger` | number | Reject decimals |
| `noGrouping` | number | No thousands separator (e.g. a year) |
| `minLength` / `maxLength` | text | Length bounds |
| `summaryLabel` | all | Short label for summary / detail / PDF views |
| `summarySection` | all | Groups answers into sections in detail / PDF views |

---

## Pricing Formula (Summary)

**Vacant Home** — `src/data/ratingFactors.ts` + `src/engine/quoteCalculator.ts`:

```
Premium = $500 (base)
  × province_factor × vacancy_duration_factor × property_type_factor
  × property_value_factor × year_built_factor × inspection_frequency_factor
  × security_factor × prior_claims_factor × deductible_factor
  × coverage_percent_factor
  + flat_adjustments ($)

Coverage = property_value × (coverage_percent / 100)
```

**Jeweller's Block** — `src/data/jewellerRatingFactors.ts` + `src/engine/jewellerQuoteCalculator.ts`:

```
Base = max_stock_value × 0.01 (1% of sum insured)
Premium = Base
  × business_type_factor × province_factor × years_in_business_factor
  × stock_in_safe_factor × safe_rating_factor × alarm_factor
  × window_display_factor × offsite_value_factor (only if off-site)
  × prior_losses_factor × deductible_factor
  + flat_loadings ($)

Coverage = max_stock_value (the sum insured)
```

See `docs/UNDERWRITING_ENGINE.md` for the full factor tables.

---

## Decision Outcomes

| Outcome | When | Screen |
|---|---|---|
| **Accept** | No UW rules triggered | Premium breakdown + Buy This Policy button |
| **Decline** | Any `decision: "decline"` rule fires | Polite rejection + reason(s) |
| **Refer** | Only `decision: "refer"` rules fire | "Specialist will call" + next steps |

Decline always beats Refer if both are triggered.

**Referred quotes** go to an underwriter/admin in `/review`; approving flips the decision to Accept and emails the broker. Decline rules live in the **product's** questions file; the engine runs the same way for every product.

### Buy → Pay flow

1. Broker clicks **Buy This Policy** → policy is bound (`purchased`) and a payment link is **emailed to the applicant** (`/pay/<token>`).
2. The **customer** opens the link (public, no login) and pays via a card form that is format-validated only — **no real charge** (swap a real gateway into `/api/pay/[token]` later).
3. On success the policy is marked **Paid** and a confirmation + receipt are emailed. Bound-but-unpaid policies show in the broker's **Action Required** with a Resend Link option.

---

## Adding a New Product

1. Create `src/data/<product>Questions.ts` exporting a `Question[]` array + a `FIRST_QUESTION_ID`.
2. Create `src/engine/<product>QuoteCalculator.ts` exporting a `calculate(answers): QuoteDetails` function. Call `runUnderwritingEngine(answers, <product>Questions)` first, then apply your factors. Reuse a `<product>RatingFactors.ts` file for the multipliers.
3. Register it in `src/data/products.ts` under `PRODUCTS` with `id`, `policyType`, `questions`, `firstQuestionId`, `calculate`, and `intro`.

The conversational engine, persistence, summary/PDF, and result screens are shared — no other code changes needed.

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
npm run dev        # Development — http://localhost:3000
npm run db:seed    # Create demo accounts (admin / underwriter / broker — Demo1234!)
npm run build      # Production build (checks for errors)
npm start          # Run the production build
npx prisma studio  # Visual database browser at http://localhost:5555
npx prisma generate  # Regenerate Prisma client after schema changes
```

---

## File Map (Where Is What?)

| I want to change… | Edit this file |
|---|---|
| Product registry (add/edit products) | `src/data/products.ts` |
| Vacant-home questions / options / branching | `src/data/questions.ts` |
| Jeweller questions / options / branching | `src/data/jewellerQuestions.ts` |
| Farm questions / options / branching | `src/data/farmQuestions.ts` |
| Vacant-home rating multipliers | `src/data/ratingFactors.ts` |
| Jeweller rating multipliers | `src/data/jewellerRatingFactors.ts` |
| Farm rating multipliers | `src/data/farmRatingFactors.ts` |
| Decline / Refer rules | the product's questions file → `underwritingRules` |
| Vacant-home quote calculation | `src/engine/quoteCalculator.ts` |
| Jeweller quote calculation | `src/engine/jewellerQuoteCalculator.ts` |
| Farm quote calculation | `src/engine/farmQuoteCalculator.ts` |
| Underwriting evaluation logic (shared) | `src/engine/underwritingEngine.ts` |
| AI underwriter recommendation (advisory) | `src/lib/aiUnderwriter.ts` → `/api/submissions/[id]/ai-review` |
| Chat bubble style | `src/components/ChatBubble.tsx` |
| Typing delay (ms) | `src/components/ConversationView.tsx` → `TYPING_DELAY_MS` |
| Progress bar | `src/components/ProgressBar.tsx` |
| Summary screen | `src/components/SummaryScreen.tsx` |
| Result screens (Accept/Decline/Refer) | `src/components/QuoteResult.tsx` |
| Buy → bind + email pay link | `src/app/api/buy-policy/route.ts` |
| Customer payment (public) | `src/app/pay/[token]/page.tsx`, `src/app/api/pay/[token]/route.ts` |
| Underwriter review | `src/app/(protected)/review/page.tsx`, `src/app/api/submissions/[id]/review/route.ts` |
| Admin overview / users | `src/app/(protected)/admin/page.tsx`, `admin/users/page.tsx`, `src/app/api/admin/users/` |
| Role access rules (RBAC) | `src/lib/access.ts` |
| Broker avatar / name ("Alex") | `src/components/ConversationView.tsx`, `ChatBubble.tsx` |
| App colours | `tailwind.config.ts` + inline Tailwind classes |
| Welcome screen | `src/components/IntroScreen.tsx` |
| Page-level layout | `src/app/page.tsx` |
| Fonts / metadata | `src/app/layout.tsx` |
| Help Navigator FAQ documents | `knowledge/` folder (drop `.md` or `.txt` files) |
| Help Navigator chat widget | `src/components/HelpChatWidget.tsx` |
| Help Navigator API | `src/app/api/help-chat/route.ts` |
| Change-answer AI feature | `src/app/api/chat-intent/route.ts` |
| Authentication config | `src/lib/auth.ts` |
| Email sending | `src/lib/email.ts` |
| Database schema | `prisma/schema.prisma` |
| Demo accounts (roles) | `prisma/seed.js` |
