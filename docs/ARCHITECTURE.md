# Architecture Guide

This document explains how the application is structured — the multi-product registry, the conversational state machine, authentication, components, data flow, the underwriting/pricing engines, PDF generation, email, and PWA support — so you can confidently extend or modify any part of it.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Application Structure](#application-structure)
3. [The Multi-Product Registry](#the-multi-product-registry)
4. [Authentication & Route Protection](#authentication--route-protection)
5. [The Four Quote Phases](#the-four-quote-phases)
6. [Component Tree](#component-tree)
7. [State Management — QuoteContext](#state-management--quotecontext)
8. [The Answer-Preservation / Edit Flow](#the-answer-preservation--edit-flow)
9. [Data → Engine → Persistence → View](#data--engine--persistence--view)
10. [The Underwriting & Pricing Engines](#the-underwriting--pricing-engines)
11. [Drafts, Submissions & Broker Isolation](#drafts-submissions--broker-isolation)
12. [PDF Generation](#pdf-generation)
13. [Email Flow](#email-flow)
14. [AI Features](#ai-features)
15. [Maps & Address Autocomplete](#maps--address-autocomplete)
16. [PWA & Dynamic Icons](#pwa--dynamic-icons)
17. [Adding a New Product](#adding-a-new-product)

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, async params) | 16 |
| UI runtime | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | v3 |
| Animation | Framer Motion | v11 |
| Auth | NextAuth.js | v4 (JWT, Credentials) |
| ORM | Prisma | 5 |
| Database | PostgreSQL | — |
| Payments | Stripe (hosted Checkout + webhook) | — |
| Email | Resend → Nodemailer (SMTP) → Ethereal | — |
| PDF | `@react-pdf/renderer` | — |
| Maps | Google Maps JS + Static/Embed APIs | — |
| AI | OpenAI API | gpt-4o-mini |
| Observability | Sentry (`@sentry/nextjs`) | — |
| PWA | Web manifest + dynamic OG icons | — |
| State | React Context | — |

> Note: `prisma/schema.prisma` declares `provider = "postgresql"`. The README/CLAUDE notes that mention SQLite are out of date relative to the schema.
>
> **Next.js 16 / React 19:** route handlers and dynamic pages receive `params` as a Promise — `{ params }: { params: Promise<{ id: string }> }` and `const { id } = await params`.

---

## Application Structure

```
src/
  app/
    (auth)/                 ← No header/footer/chrome (login only)
      login/page.tsx
    (protected)/            ← Auth-guarded; Header + Footer + HelpChatWidget
      layout.tsx            ← Server component; getServerSession → redirect("/login")
      dashboard/page.tsx    ← Broker landing: KPI cards + BookCharts analytics +
                              Action Required + Upcoming Renewals + Recent + Export CSV
                              (UNDERWRITER → /review, ADMIN → /admin)
      review/page.tsx       ← Underwriter/Admin: ReviewStats + aging pending queue
      queue/page.tsx        ← All pending referrals, oldest-first with aging
      reviews/page.tsx      ← All decisions, paginated (SubmissionSearchBox)
      policies/page.tsx     ← Bound policies only, paginated (PolicySearchBox)
      customers/page.tsx    ← Client-360 grouped by email/name, paginated (CustomerSearchBox)
      admin/page.tsx        ← Admin: portfolio analytics (AdminAnalytics) across all brokers
      admin/users/page.tsx  ← Admin: user management (search / reset password / role / activate)
      new-quote/
        page.tsx            ← Category picker
        <slug>/page.tsx     ← <QuoteExperience productId="<slug>" /> per product
      search/page.tsx       ← Role-scoped search + delete (Stage filter; underwriter = policies-only)
      policy/[id]/page.tsx  ← Detail view: top payment CTA banner (Ready to bind / Awaiting
                              customer payment), review actions, premium, map, PDF;
                              Adjust/Cancel actions only when paymentStatus = "paid"
      privacy/ terms/ support/  ← Static info pages
    pay/[token]/page.tsx    ← PUBLIC (no auth) customer checkout via emailed link
                              (Stripe hosted Checkout, or simulated card; ?paid=1 confirm-on-return)
    portal/[token]/page.tsx ← PUBLIC (no auth) customer self-service portal
                              (read-only policy, map, PDF, pay CTA, "Request a Change"; 410 when token expired)
    api/
      auth/[...nextauth]/   ← NextAuth handler
      submissions/          ← POST (save complete quote) + GET (role-scoped list)
      submissions/export/   ← GET → role-scoped CSV (underwriter forced to bound policies)
      submissions/[id]/     ← DELETE (owner/admin; bound policies rejected 409)
      submissions/[id]/review/ ← POST (underwriter/admin approve|decline + note)
      submissions/[id]/ai-review/ ← POST (underwriter/admin; AI advisory verdict, refer-only)
      submissions/[id]/cancel/ ← POST (owning broker/admin; cancel a bound policy mid-term)
      submissions/[id]/adjust/ ← POST (owning broker/admin; mid-term adjustment, pro-rata)
      drafts/               ← POST (upsert draft)
      drafts/[id]/          ← GET (load a draft for resume)
      buy-policy/           ← Bind policy (stamp 12-mo term) + email pay/portal links + underwriter notice; audits "bound"
      pay/[token]/          ← PUBLIC POST → simulated card (no charge); returns 400 when Stripe is configured
      pay/[token]/checkout/ ← PUBLIC POST → create a Stripe Checkout Session (rate-limited) → hosted URL
      stripe/webhook/       ← PUBLIC POST → signature-verified, deduped (WebhookEvent), amount-checked → finalizePaidPolicy
      portal/[token]/document/ ← PUBLIC GET → token-auth policy PDF
      portal/[token]/request/  ← PUBLIC POST → change request (rate-limited) → broker email + "change_requested" audit
      admin/users/          ← GET list / POST create (Admin only)
      admin/users/[id]/     ← PATCH role/active / reset password (Admin only)
      search/               ← Role-scoped search
      policies/suggest/  customers/suggest/  reviews/suggest/  queue/suggest/
                            ← Typeahead suggest APIs (case-insensitive)
      policy/[id]/document/ ← GET → generated PDF download
      chat-intent/          ← AI: which answer does the user want to edit?
      help-chat/            ← AI: Help Navigator (knowledge-base Q&A)
      analytics/            ← Aggregated statistics
    layout.tsx              ← Root layout (Providers, PWA meta, viewport)
    page.tsx                ← Redirect entry point
    manifest.ts             ← Dynamic web manifest
    icon.tsx / apple-icon.tsx ← Dynamic favicon / Apple touch icon (ImageResponse)
    pwa-icon/[size]/route.tsx ← Dynamic PWA icon at any size
  components/
    QuoteExperience.tsx     ← QuoteProvider + QuoteShell (phase switch + rail)
    IntroScreen.tsx         ← phase "intro"
    ConversationView.tsx    ← Chat UI, typing loop, "change an answer" input
    SummaryScreen.tsx       ← Review list with per-row Edit button
    QuoteResult.tsx         ← Accept / Decline / Refer + buy flow
    QuestionProgressRail.tsx ← Vertical section stepper beside the chat
    InputRenderer.tsx       ← Routes question.type → input component
    inputs/                 ← Choice, Toggle, Dropdown, Number, Currency,
                              Date, Text, Address (Google Places autocomplete)
    BuyPolicyButton.tsx     ← Bind + email pay link (also "Resend payment link")
    CancelPolicyButton.tsx  ← Cancel a bound policy mid-term (reason + cancellation email)
    AdjustPolicyButton.tsx  ← Mid-term adjustment (new sum insured, live pro-rata estimate)
    CancelledBadge.tsx      ← Red "Cancelled" pill (replaces Paid/Unpaid for cancelled policies)
    ReviewActions.tsx       ← Underwriter approve/decline + note + "Get AI Recommendation"
    PaymentForm.tsx         ← Card form (validated, not charged) → pay endpoint
    PaymentBadge.tsx        ← Paid / Unpaid pill
    BookCharts.tsx          ← Dashboard analytics (premium volume, outcomes/close-rate, mix, value)
    ReviewStats.tsx         ← Underwriter review KPIs
    AdminAnalytics.tsx      ← Portfolio analytics incl. top brokers by premium
    ActionRequiredList.tsx  ← Dashboard "Action Required" (top 5)
    ExportCsvButton.tsx · EmptyState.tsx
    SubmissionSearchBox / CustomerSearchBox / PolicySearchBox ← typeahead inputs
    admin/UserManager.tsx   ← Admin user table (create / role / activate / reset password)
    Header / Footer / HelpChatWidget / PropertyMap / StageBadge / ...
  context/
    QuoteContext.tsx        ← All quote state + the conversational state machine
  data/
    products.ts             ← PRODUCTS registry, getProduct, productSlugForPolicyType
    questions.ts / ratingFactors.ts           ← Vacant Home flow + factors
    jewellerQuestions.ts / jewellerRatingFactors.ts ← Jeweller Block flow + factors
    farmQuestions.ts / farmRatingFactors.ts   ← Farm Insurance flow + factors
    …Questions.ts / …RatingFactors.ts         ← cyber, contractor, AE, retailers, rental, items, batteries
  engine/
    underwritingEngine.ts   ← Accept / Decline / Refer rule evaluation (shared)
    quoteCalculator.ts      ← Vacant Home premium
    jewellerQuoteCalculator.ts ← Jeweller Block premium
    farmQuoteCalculator.ts  ← Farm Insurance premium
  lib/
    auth.ts                 ← NextAuth options (Credentials, JWT, role + active check)
    access.ts               ← Role helpers (scope/can*/requireRole) — RBAC source of truth
    aiUnderwriter.ts        ← Pluggable AI underwriter engine (inline OpenAI; Skill-ready)
    stripe.ts               ← Stripe client singleton + isStripeConfigured()
    finalizePayment.ts      ← finalizePaidPolicy(): shared idempotent paid finalizer (pay + webhook)
    portalToken.ts          ← Public pay/portal link 30-day TTL + expiry check
    rateLimit.ts            ← In-memory fixed-window limiter + clientIp + tooMany() (public routes)
    observability.ts        ← captureError(err, {area}); console always, Sentry when SENTRY_DSN set
    audit.ts                ← recordAudit() → AuditEvent (append-only lifecycle log)
    baseUrl.ts              ← publicBaseUrl(req): public link base (prefers NEXTAUTH_URL)
    prisma.ts               ← Prisma client singleton
    email.ts                ← deliver() (Resend → SMTP → Ethereal); templated senders
    policyDocument.ts       ← buildPolicyPdf(): renders the policy PDF (used by routes + receipt email)
    policyPdf.tsx           ← React-PDF document (renderPolicyPdf)
    submissionSections.ts   ← Builds detail sections (typed cols vs. generic JSON)
  utils/
    interpolate.ts          ← {{answer_id}} substitution in broker text
    sections.ts             ← Section labels + ordered section list
    validate.ts             ← Pure input validators
    googleMaps.ts           ← Lazy JS loader + embed/static map URLs
    policyNumber.ts         ← Stable PREFIX-YEAR-CODE reference (UI/PDF/emails/Stripe)
  middleware.ts             ← withAuth — guards /dashboard, /new-quote, /search

knowledge/                  ← FAQ + policy-wording docs for Help Navigator (.md/.txt/.pdf)
prisma/
  schema.prisma             ← Broker (role/active) + Submission (review + payment + Stripe fields + paymentTokenExpiresAt + effectiveAt/expiresAt term + cancelledAt/cancelReason + adjustments log) + WebhookEvent (Stripe dedup) + AuditEvent (lifecycle log) models
.eslintrc.json              ← ESLint (next/core-web-vitals)
  seed.js                   ← Creates demo admin / underwriter / broker accounts
```

---

## The Multi-Product Registry

Each insurance product plugs into a shared engine. The conversational flow, persistence,
result UI, PDF, and email are product-agnostic; a product only supplies its own questions,
first-question id, premium calculator, policy type label, and intro copy.

`src/data/products.ts` defines `ProductConfig` and the `PRODUCTS` map:

| Product (`id` / slug) | `policyType` | Questions | Calculator |
|---|---|---|---|
| `vacant-home` | `Vacant Home Insurance` | `QUESTIONS` | `calculateQuote` |
| `jeweller-block` | `Jeweller Block Insurance` | `JEWELLER_QUESTIONS` | `calculateJewellerQuote` |
| `farm` | `Farm Insurance` | `FARM_QUESTIONS` | `calculateFarmQuote` |
| `cyber-liability` | `Cyber Liability Insurance` | `CYBER_QUESTIONS` | `calculateCyberQuote` |
| `contractor` | `Contractor Insurance` | `CONTRACTOR_QUESTIONS` | `calculateContractorQuote` |
| `architects-engineers` | `Architects & Engineers Insurance` | `AE_QUESTIONS` | `calculateArchitectsEngineersQuote` |
| `retailers` | `Retailers Insurance` | `RETAIL_QUESTIONS` | `calculateRetailersQuote` |
| `rental-home` | `Rental Home Insurance` | `RENTAL_QUESTIONS` | `calculateRentalHomeQuote` |
| `personal-items` | `Personal Items Insurance` | `ITEMS_QUESTIONS` | `calculatePersonalItemsQuote` |
| `lithium-batteries` | `Lithium Battery Insurance` | `BATTERY_QUESTIONS` | `calculateLithiumBatteriesQuote` |

Helpers:

- `getProduct(productId)` — returns the config, falling back to `DEFAULT_PRODUCT_ID` (`vacant-home`) for unknown ids.
- `productSlugForPolicyType(policyType)` — reverse lookup used by the detail page's "Resume Quote" link to route a draft back to its product flow.

Each product page (`/new-quote/<slug>`) is a thin wrapper that renders `<QuoteExperience productId="…" />`. The category picker at `/new-quote` groups products into categories (incl. an **Agriculture** category for `farm`); each live product has an `href` and unbuilt ones render a "Coming Soon" badge. All ten products ship with comprehensive question sets, rating factors, and underwriting rules. `src/data/_allProductsRouting.test.ts` validates every product's flow end-to-end (routing integrity).

**Farm Insurance** is the most extensive flow: ~55 questions structured to mirror the paper application's modules (General Information, Locations, Habitational, Farm Buildings, Machinery & Equipment, Livestock, Earnings & Profits, Tank Data, Liability, Loss History, Property & Coverage, Broker Information), with conditional branches (oil-tank detail, bush cords, livestock skip, tank detail, loss detail) and decline/refer rules. Repeating tables (multiple locations/buildings/machinery/livestock/tanks) are captured as counts + aggregate values + the primary item in detail, since the chat engine is linear.

---

## Authentication & Route Protection

1. `src/middleware.ts` (`withAuth`) guards `/dashboard/*`, `/new-quote/*`, `/search/*` — no token → redirect to `/login`. An optional `SESSION_VERSION` env var invalidates stale dev sessions.
2. The `(protected)` layout *also* calls `getServerSession(authOptions)` and `redirect("/login")` server-side as a second gate (and covers `/policy/*`, `/review`, `/admin/*`).
3. Login posts to NextAuth's Credentials provider (`src/lib/auth.ts`), which looks up the `Broker` by email, **rejects inactive accounts** (`!broker.active`), and verifies the password with `bcrypt.compare`.
4. On success a signed JWT (8-hour `maxAge`) is issued; `id`, `name`, and **`role`** are copied onto the token and surfaced on `session.user`.
5. API route handlers individually call `getServerSession(authOptions)` and return `401`/`403` based on session and role.
6. `/pay/[token]`, `/portal/[token]`, and their APIs (`/api/pay/[token]*`, `/api/stripe/webhook`, `/api/portal/[token]/*`) are **public** (no session) — the customer reaches them via a tokenised link emailed after a policy is bound. The token carries a **30-day expiry** (`paymentTokenExpiresAt`, `src/lib/portalToken.ts`); expired public links return **410** (and the portal page shows a "link expired" state). Public routes are rate-limited (`src/lib/rateLimit.ts`); the Stripe webhook additionally verifies its signature.

### Roles & RBAC

The `Broker` model carries a `role` (`"ADMIN" | "BROKER" | "UNDERWRITER"`) and an `active` flag. `src/lib/access.ts` is the single source of truth for what each role can do:

| Helper | Rule |
|---|---|
| `submissionScopeWhere(user)` | `{ brokerId }` for BROKER; `{}` (all rows) for ADMIN/UNDERWRITER — reused by dashboard, search, list/admin/review queries |
| `canViewSubmission(user, sub)` | BROKER → own only; ADMIN/UNDERWRITER → any |
| `canReview(user)` | ADMIN/UNDERWRITER (approve/decline referred quotes) |
| `canBindOrPay(user, sub)` | owning BROKER or ADMIN |
| `canManageUsers(user)` | ADMIN only |
| `requireRole(session, roles[])` | server-page guard; redirects to `/login` (no session) or `/dashboard` (wrong role) |

**Role landings:** BROKER → `/dashboard`, UNDERWRITER → `/review`, ADMIN → `/admin` (the dashboard page redirects the latter two). The `Header` renders role-specific nav and an Action Required badge for brokers. `access.ts`'s pure helpers are covered by `src/lib/access.test.ts`.

**Role-scoped list pages.** Beyond the dashboard, several paginated list pages share the same scoping and typeahead pattern:

| Page | Scope | Shows |
|---|---|---|
| `/policies` | role-scoped | bound policies only (`PolicySearchBox`) |
| `/customers` | role-scoped | Client-360 grouped by email/name (`CustomerSearchBox`) |
| `/search` | role-scoped (underwriter = policies-only) | all submissions, filters incl. Stage (quote/policy) |
| `/reviews` | ADMIN/UNDERWRITER | all decisions (`SubmissionSearchBox`) |
| `/queue` | ADMIN/UNDERWRITER | all pending referrals, oldest-first with aging |
| `/review` | ADMIN/UNDERWRITER | overview (`ReviewStats`) + aging pending queue |
| `/admin` | ADMIN | portfolio analytics (`AdminAnalytics`, top brokers by premium) |
| `/admin/users` | ADMIN | search, reset-password, role/active toggle |

Each list-search input is backed by a case-insensitive (`mode: "insensitive"`) suggest API: `/api/policies/suggest`, `/api/customers/suggest`, `/api/reviews/suggest`, `/api/queue/suggest`. The broker dashboard and these pages can export the current role-scoped view as CSV via `GET /api/submissions/export` (underwriter exports are forced to bound policies).

### Demo accounts

All demo accounts use password `Demo1234!`:

| Role | Email |
|---|---|
| Admin | `admin@demo.com` |
| Underwriter | `underwriter@demo.com` |
| Broker | `broker@demo.com`, `harpreet.singh@insureflow.com` |

Run `npm run db:seed` to create them. (The login page no longer displays demo credentials.)

---

## The Four Quote Phases

The quote flow is a state machine driven by `AppPhase` in `QuoteContext`. `QuoteShell`
(`QuoteExperience.tsx`) switches on `phase` inside an `AnimatePresence`:

```
"intro" → "conversation" → "summary" → "result"
```

| From | To | Trigger |
|---|---|---|
| `intro` | `conversation` | `startConversation()` (Intro screen CTA) |
| `conversation` | `summary` | `submitAnswer` re-walks the path and reaches `__SUBMIT__` |
| `summary` | `result` | `confirmSummary()` — runs the calculator |
| `summary`/`result` | `conversation` | `goToQuestion()` (edit an answer) returns to chat |

The `QuestionProgressRail` (a vertical section stepper) is shown beside the shell during
`conversation` and `summary`, and reads `complete` during `summary`/`result`.

---

## Component Tree

```
<QuoteExperience productId>            ← page-level wrapper
  <QuoteProvider productId>            ← global state for one product
    <QuoteShell>
      <QuestionProgressRail/>          ← when phase ∈ {conversation, summary}
      <AnimatePresence mode="wait">
        ├── <IntroScreen>              ← "intro"
        ├── <ConversationView>         ← "conversation"
        │     ├── Top bar (Alex avatar · policyType)
        │     ├── <ProgressBar>
        │     ├── Chat scroll area: <ChatBubble> × N + <TypingIndicator>
        │     └── Input area: helper text, <InputRenderer>,
        │           "← Go back", and the AI "change an answer" box
        ├── <SummaryScreen>            ← "summary" (per-row Edit → goToQuestion)
        └── <QuoteResult>              ← "result"
              ├── AcceptResult         ← premium breakdown → buy → success screen
              ├── DeclineResult
              └── ReferResult

Protected layout (every protected page):
  <Header> · <main>{children}</main> · <Footer> · <HelpChatWidget>
```

---

## State Management — QuoteContext

All cross-component quote state lives in `src/context/QuoteContext.tsx`. The provider takes a
`productId` and resolves its config once via `useRef(getProduct(productId))`, so `questions`,
`firstQuestionId`, `policyType`, `intro`, and `calculate` are fixed for the lifetime of the flow.

### State

| Variable | Description |
|---|---|
| `phase` | Current screen (`AppPhase`) |
| `answers` | `Record<questionId, { questionId, value, displayValue }>` |
| `currentQuestionId` | Question the user is on |
| `questionHistory` | Ordered ids on the *current* answered path |
| `conversationMessages` | Broker + user chat bubbles |
| `quoteDetails` | Result of `product.calculate(answers)` |
| `submissionId` | DB id, set after the async save resolves |

`progress` and `canGoBack` are derived from `questionHistory.indexOf(currentQuestionId)`.
A `sessionId` and `draftIdRef` (both refs) track the auto-saved draft.

### Functions

| Function | What it does |
|---|---|
| `startConversation()` | `phase → "conversation"` |
| `submitAnswer(id, value, displayValue, extra?)` | Records the answer (+ any derived `extra`), re-walks the path, advances or submits |
| `addBrokerMessage(text, questionId)` | Appends a broker bubble (called after the typing delay) |
| `goBack()` | Steps to the previous history id; hides messages from there on but **keeps** answers |
| `goToQuestion(targetId)` | Jumps to any visited question to edit it; hides messages from the target on, keeps answers, returns to `conversation` |
| `confirmSummary()` | Calculates the quote, shows the result, promotes the draft to a complete submission |
| `resumeFromDraft(savedAnswers, draftId)` | Rebuilds history + chat from a saved draft |
| `restart()` | Resets all state |

### Routing helpers

- `resolveNextQuestionId(questions, id, value, answers)` — evaluates `conditionalBranches`
  (each branch can compare the current value or another answer's value) and falls back to
  `defaultNextQuestionId`, or `"__SUBMIT__"`.
- `walkAnsweredPath(questions, answers, firstQuestionId)` — starting from the first question,
  follows `resolveNextQuestionId` through every *answered* question and returns the ordered
  `path` plus a `stopId` (the first unanswered question, or `"__SUBMIT__"`). This is the core
  of the edit/preservation behavior below.

---

## The Answer-Preservation / Edit Flow

This is the most subtle part of the app. When a broker edits an earlier answer (via the
Summary screen's Edit button, the in-chat AI "change an answer" box, or Go back), later
answers should **survive** if they're still reachable, and only answers that fall off a
changed branch should be **pruned**.

`submitAnswer` implements this:

1. Merge the new answer (and any `extra` derived answers) into the existing `answers`.
2. Call `walkAnsweredPath` to recompute the reachable, answered path from the start.
3. Keep only answers whose ids are on that path; drop the rest (`pathSet` filter). This is
   what prunes now-unreachable answers when a branch changes.
4. Set `questionHistory = path`.
5. Auto-save a draft once `≥ 3` answers exist (`POST /api/drafts`).
6. For the questions *between* the edited one and the resume point that are already answered,
   re-emit their broker + user chat bubbles so the transcript stays coherent without forcing
   the broker to re-answer them.
7. If `stopId === "__SUBMIT__"`, go to `summary`; otherwise set `currentQuestionId = stopId`.

`goBack` and `goToQuestion` deliberately **keep** answers and only hide the chat messages from
the chosen point onward — so when the broker moves forward again, downstream questions are
already answered and auto-replay rather than starting blank.

`ConversationView` cooperates with this: when its typing effect fires for a question whose
broker bubble is *already* in `conversationMessages`, it skips the typing delay and reveals
the input immediately.

---

## Data → Engine → Persistence → View

```
ANSWER SUBMITTED (InputRenderer → ConversationView.handleSubmit)
   └─ submitAnswer(): merge → walkAnsweredPath → prune → history → draft autosave

"Calculate My Quote" (SummaryScreen)
   └─ confirmSummary():
        product.calculate(answers) → quoteDetails   (runs UW engine + pricing)
        phase = "result"                            (shown immediately)
        POST /api/submissions { answers, quoteDetails, draftId, policyType }
            → promotes the draft (or creates) → setSubmissionId(id)   (non-blocking)

"Buy This Policy" (AcceptResult / BuyPolicyButton)
   └─ POST /api/buy-policy { submissionId }
        → canBindOrPay ownership check; decision must be "accept"; not already paid
        → set purchased = true; stamp effectiveAt/expiresAt (12-month term);
          generate paymentToken + paymentTokenExpiresAt (30-day TTL, idempotent)
        → sendPaymentRequestEmail() to the APPLICANT with /pay/<token> + /portal/<token> links
        → optional sendUnderwriterNotificationEmail() on first bind
        → recordAudit("bound" | "payment_link_resent")
        → { success, sentTo, previewUrl }   (broker sees "payment link sent")
        (calling again on a bound-but-unpaid policy resends the link and refreshes the 30-day window)

Customer pays (public — no login)  /pay/<token>
   ├─ STRIPE (when STRIPE_SECRET_KEY set):
   │    POST /api/pay/[token]/checkout → create hosted Checkout Session (CAD, line item =
   │      product + policy number), store stripeSessionId → redirect to Stripe
   │    POST /api/stripe/webhook (authoritative): verify signature, dedup via WebhookEvent,
   │      check amount vs annualPremium → finalizePaidPolicy()
   │    Safety net: return to /pay/<token>?paid=1 retrieves the session and finalizes if
   │      Stripe says paid (covers a dropped/delayed webhook) — idempotent
   └─ SIMULATED (only when Stripe NOT configured):
        POST /api/pay/[token] { cardNumber, expiry, cvc } → validate format only (NO charge)
        → finalizePaidPolicy()   (returns 400 if Stripe IS configured)

   finalizePaidPolicy() (src/lib/finalizePayment.ts) — single idempotent finalizer:
        → set paymentStatus = "paid", paidAt, paidAmount (+ stripe fields); no-op if already paid
        → recordAudit("paid")
        → sendPolicyConfirmationEmail() + sendPaymentReceiptEmail() (branded PDF attached) to applicant

Customer self-service (public — no login)  /portal/<token>
   ├─ GET /api/portal/[token]/document → token-auth policy PDF
   └─ POST /api/portal/[token]/request { message } → rate-limited change request
        → recordAudit("change_requested") + sendChangeRequestEmail() to the broker

Underwriter review (referred quotes)  /review → /policy/[id]
   └─ POST /api/submissions/[id]/review { action: approve|decline, note }
        → canReview; submission must be decision = "refer"
        → set decision (accept|decline) + reviewedById/reviewedAt/reviewNote
        → recordAudit("reviewed")
        → on approve → sendQuoteApprovedEmail() to the broker

Mid-term adjustment (paid, non-cancelled)  /policy/[id] (AdjustPolicyButton)
   └─ POST /api/submissions/[id]/adjust { coverageAmount, reason }
        → canBindOrPay ownership check; must be purchased AND paymentStatus = "paid" and not cancelled
        → newAnnual = oldAnnual × newCoverage / oldCoverage (premium scales with sum insured)
        → proRata = (newAnnual − oldAnnual) × remainingDays / termDays (effectiveAt→expiresAt)
        → update coverageAmount/annualPremium/monthlyPremium; append an MTA record to adjustments[]
        → recordAudit("adjusted")
        → sendAdjustmentEmail() to the applicant → { success, newAnnual, oldAnnual, proRata, remainingDays, sentTo, previewUrl }

Cancellation (paid policy)  /policy/[id] (CancelPolicyButton)
   └─ POST /api/submissions/[id]/cancel { reason }
        → canBindOrPay ownership check; must be purchased AND paymentStatus = "paid" and not already cancelled
        → stamp cancelledAt + cancelReason
        → recordAudit("cancelled")
        → sendCancellationEmail() to the applicant → { success, sentTo, previewUrl }
```

The full policy lifecycle is: **quote → (refer → AI review/approve) → bind → pay → adjust (MTA) / cancel**, with the **customer portal** and **change requests** running alongside. Every money/lifecycle action emails the customer and writes an `AuditEvent` (rendered as the **Activity** timeline on the policy detail page). Money-path failures are reported via `captureError` (Sentry when `SENTRY_DSN` is set).

`brokerText` shown in the chat is run through `interpolate()` to substitute `{{answer_id}}`
placeholders with prior `displayValue`s.

---

## The Underwriting & Pricing Engines

### Underwriting (`src/engine/underwritingEngine.ts`)

`runUnderwritingEngine(answers, questions)` walks every question's `underwritingRules`,
applying a `compare()` over operators (`equals`, `not_equals`, `greater_than[_or_equal]`,
`less_than[_or_equal]`, `contains`, `in_list`). Triggered rules push a decline or referral
reason. **Decline takes precedence over Refer**, and either takes precedence over Accept.
The engine is shared; each calculator passes its own product's question set.

### Pricing

Both calculators run the UW engine, then build a `factors[]` breakdown and a `QuoteDetails`
result (decision + reasons + premiums + coverage + factors).

- **Vacant Home** (`quoteCalculator.ts`): multiplicative — `BASE_PREMIUM` × province ×
  vacancy duration × property type × replacement-cost (dynamic) × age × inspection ×
  security × claims × deductible × coverage %, then flat surcharges (unfenced pool, known
  damage, coverage lapse, active utilities). Coverage amount = property value × coverage %.
- **Jeweller Block** (`jewellerQuoteCalculator.ts`): sum-insured driven — base = max stock
  value × `JEWELLER_BASE_RATE`, then business type × province × years trading × % in safe ×
  safe grade × alarm × window exposure × (off-site, only if carried) × losses × deductible,
  plus flat loadings (high window value, transit). Coverage amount = max stock value.
- **Farm** (`farmQuoteCalculator.ts`): sum-insured driven — base = total sum insured ×
  `FARM_BASE_RATE`, then operation type × province × experience × revenue × dwelling
  age/construction/roof/wiring/plumbing/heating × solid-fuel heat × fire-protection/security/pool
  × building schedule × liability limit × loss history × deductible, plus flat loadings
  (certified wood heat, agritourism, livestock bailee). Coverage amount = total sum insured.
- **Other products** (cyber, contractor, AE, retailers, rental, personal items, lithium batteries)
  follow the same sum-insured/exposure-driven pattern in their own `…QuoteCalculator.ts`.

Factors with `multiplier !== 1` or a positive `adjustment` are rendered in the breakdown UI;
the engine result's `decision` selects the Accept/Decline/Refer screen.

---

## Drafts, Submissions & Broker Isolation

A single `Submission` row models both drafts and completed quotes/policies, distinguished by
`status` (`"draft"` | `"complete"`) and `purchased` (quote vs. bound policy).

- **Drafts** — `POST /api/drafts` upserts a row (`status: "draft"`) once `submitAnswer`
  collects 3+ answers. The detail page offers "Resume Quote" (`/new-quote/<slug>?resume=<id>`);
  `QuoteShell` reads `?resume`, `GET /api/drafts/[id]`, and calls `resumeFromDraft`.
- **Submissions** — `POST /api/submissions` writes typed columns (extracted by question id),
  the full `allAnswers` JSON blob, the decision, premiums, and reason arrays. If a `draftId`
  exists it updates that row to `status: "complete"`; otherwise it creates one.
- **Role-based access** — every detail/search/list/PDF/buy query goes through `src/lib/access.ts`
  (`submissionScopeWhere` / `canViewSubmission` / `canBindOrPay`). Brokers are scoped to
  `brokerId === session.user.id`; admins and underwriters see all brokers' submissions.
  `DELETE /api/submissions/[id]` allows the owning broker or an admin and refuses to delete a
  `purchased` (bound) policy with `409`.

### Underwriter Review & Payment

- **Review** — referred quotes (`decision = "refer"`) collect in `/review` (underwriter/admin,
  all brokers). Opening one shows `ReviewActions`; `POST /api/submissions/[id]/review` flips the
  decision to accept/decline, stamps `reviewedById`/`reviewedAt`/`reviewNote`, and emails the
  broker on approval. The broker then sees an **Action Required** item on their dashboard.
- **AI recommendation (advisory)** — `ReviewActions` has a "Get AI Recommendation" button →
  `POST /api/submissions/[id]/ai-review` (underwriter/admin, refer-only). It returns a typed
  verdict — `approve`/`decline` + confidence + 2–5 reasons — rendered as an "AI Suggestion" card
  and used to pre-fill the review note; the human still confirms. The engine is **pluggable** via
  the `UnderwriterEngine` interface in `src/lib/aiUnderwriter.ts`; the active engine is an inline
  OpenAI call (`gpt-4o-mini`, JSON output, funded by `OPENAI_API_KEY`). A future Anthropic
  Agent-Skill engine (render submission → PDF → Files API → custom Skill + code execution) can be
  dropped in by swapping `activeEngine` without touching the route or UI. Gated by
  `isAiUnderwriterConfigured()` (`503` "not configured" without the key).
- **Payment** — pressing Buy binds the policy and emails the *applicant* tokenised
  `/pay/<token>` + `/portal/<token>` links (`paymentToken` is a unique column with a 30-day
  `paymentTokenExpiresAt`). When `STRIPE_SECRET_KEY` is set the customer pays via **hosted Stripe
  Checkout** (`/api/pay/[token]/checkout` creates the session); the **authoritative paid signal** is
  the signature-verified, deduped (`WebhookEvent`), amount-checked `/api/stripe/webhook`, with a
  confirm-on-return safety net on `/pay/<token>?paid=1`. Without Stripe, the simulated `/api/pay/[token]`
  (format-validated card, no charge) stands in — and returns **400** once Stripe is configured. Both paths
  converge on the idempotent `finalizePaidPolicy()`: `paymentStatus` becomes `"paid"`, a `paid` audit is
  written, and the applicant receives a confirmation + receipt (branded PDF attached). A bound-but-unpaid
  policy can have its link resent (refreshing the 30-day window) from the policy page or dashboard. The Buy /
  Resend action is a prominent **call-to-action banner near the top** of the policy detail page ("Ready to
  bind" for an accepted-unbound quote; "Awaiting customer payment" for a bound-but-unpaid policy).
- **Mid-term adjustment & cancellation (paid only)** — both `/api/submissions/[id]/adjust` and
  `/cancel` require the policy to be bound **and** paid (`purchased && paymentStatus === "paid"`)
  and not already cancelled; the policy page only renders the Adjust / Cancel buttons for a paid,
  non-cancelled policy.
- **Cancelled policies** — a cancelled policy shows a red **"Cancelled"** badge (`CancelledBadge`)
  in place of the Paid/Unpaid pill across the broker dashboard, Policies, Customers, Search, and the
  admin Recent Activity. The dashboard has a dedicated **Cancelled Policies** section (after Recent
  Policies); Recent Policies lists only active (non-cancelled) policies, and cancelled policies are
  excluded from **Upcoming Renewals** and from a customer's active-premium / next-renewal totals.
- **Policy term & renewals** — binding stamps `effectiveAt`/`expiresAt` (12-month term) on the
  `Submission`; the dashboard's **Upcoming Renewals** derives from `expiresAt` (cancelled policies excluded).

---

## PDF Generation

`buildPolicyPdf` (`src/lib/policyDocument.ts`) optionally fetches a Google **Static Maps** PNG and
inlines it as a base64 data URI, builds the detail sections via `buildSubmissionSections`, and calls
`renderPolicyPdf` (`src/lib/policyPdf.tsx`, `@react-pdf/renderer`) to produce a PDF buffer. This is pure
Node — no headless browser. It is served two ways and reused for email attachments:

- `GET /api/policy/[id]/document` — **broker** (auth, role-scoped).
- `GET /api/portal/[token]/document` — **customer** (public, token-auth; 410 when expired).
- Attached to the payment-receipt email by `finalizePaidPolicy` (best-effort).

`buildSubmissionSections` (`src/lib/submissionSections.ts`) is product-aware: Vacant Home
renders from typed columns; other products (Jeweller Block) render generically from the
`allAnswers` JSON, grouped by each question's `summarySection` and labeled by `summaryLabel`.
The same builder feeds the on-screen detail page (`policy/[id]/page.tsx`) and the PDF.

---

## Email Flow

`src/lib/email.ts` centralizes delivery in `deliver()`, which prefers **Resend** (`RESEND_API_KEY`),
then real **SMTP** (`SMTP_USER` + `SMTP_PASS`), then an auto-created **Ethereal** test account that
returns a browser `previewUrl`. Senders accept optional attachments (the receipt attaches a branded
policy PDF). It exposes these templated senders:

- `sendPaymentRequestEmail` — applicant-facing "complete your payment" with the `/pay/<token>` +
  `/portal/<token>` links and amount due. Sent by `/api/buy-policy` after the policy is bound.
- `sendPolicyConfirmationEmail` — applicant-facing confirmation (premium summary, policy number).
  Sent by `finalizePaidPolicy` after payment succeeds.
- `sendPaymentReceiptEmail` — applicant-facing receipt (amount, date) **with the branded PDF attached**.
  Sent by `finalizePaidPolicy` on payment success.
- `sendQuoteApprovedEmail` — broker-facing notice that a referred quote was approved and is
  ready to bind. Sent by the review endpoint.
- `sendUnderwriterNotificationEmail` — best-effort back-office notice on first bind, only when
  `UNDERWRITER_EMAIL` is set; failures never block the bind.
- `sendAdjustmentEmail` — applicant-facing notice of a mid-term adjustment (old/new coverage,
  old/new premium, pro-rata charge/return). Sent by `/api/submissions/[id]/adjust`.
- `sendCancellationEmail` — applicant-facing cancellation confirmation (effective date, reason).
  Sent by `/api/submissions/[id]/cancel`.
- `sendChangeRequestEmail` — broker-facing notice of a customer change request from the portal.
  Sent by `/api/portal/[token]/request`.

All senders return `{ sentTo, previewUrl? }` (`previewUrl` only in Ethereal mode). The
buy/review/pay/adjust/cancel UIs surface the recipient and, in Ethereal mode, an "Open … email" button.

---

## AI Features

Both use `gpt-4o-mini` and short-circuit with a "not configured" message when
`OPENAI_API_KEY` is missing.

### Help Navigator — `POST /api/help-chat`

`HelpChatWidget` (floating, on every protected page). On each request the server reads every
`.md`/`.txt`/`.pdf` in `knowledge/` (skipping `README`, capped at `KB_CHAR_LIMIT`), parses
PDFs via `pdf-parse`, and injects them as system context alongside a portal description. It is
tuned to answer insurance policy-wording questions and only declines truly unrelated topics.
No restart is needed when knowledge files change. The `knowledge/` folder includes per-product
FAQs (incl. `farm-faq.md`) and portal guides — `getting-started`, `broker-guide`,
`underwriter-guide`, `admin-guide`, `ai-underwriter`, `payments-binding-renewals`, `portal-faq`.

### Change-an-Answer — `POST /api/chat-intent`

The bottom of `ConversationView`'s input area (shown once ≥ 1 answer exists). The broker types
a natural-language request; the model is sent the answered questions and returns
`{ questionId, reply }` as JSON. The view shows the reply, then calls `goToQuestion(questionId)`
to rewind to that question for re-answering.

---

## Maps & Address Autocomplete

`src/utils/googleMaps.ts` lazily loads the Google Maps JS API with the Places library, gated
on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (returns `null` with no key so callers degrade to plain
inputs). It also builds `mapEmbedUrl` (iframe preview) and `staticMapUrl` (PNG for the PDF).

`inputs/AddressInput.tsx` attaches a Places `Autocomplete` (restricted to Canada). On select
it captures `formatted_address` and derives the province from the
`administrative_area_level_1` component, passing it up as an `extra` derived answer
(`property_province`) so it persists atomically with the address. A live map iframe previews
the selected address.

---

## PWA & Dynamic Icons

- `src/app/manifest.ts` — dynamic web manifest (`start_url: /dashboard`, standalone,
  portrait, theme color `#4f46e5`), referencing `/pwa-icon/192` and `/pwa-icon/512`.
- `src/app/pwa-icon/[size]/route.tsx` — edge route that renders an "IF Portal" icon at any
  requested size via `ImageResponse`.
- `src/app/icon.tsx` / `apple-icon.tsx` — dynamic favicon and Apple touch icon.
- `src/app/layout.tsx` — sets `manifest`, `appleWebApp`, and viewport metadata.

---

## Adding a New Product

1. Add a question set (and any rating factors) under `src/data/` — give each question a
   `summarySection`/`summaryLabel` so the generic section builder and progress rail work.
2. Write a `calculate(answers): QuoteDetails` that calls `runUnderwritingEngine(answers, yourQuestions)`.
3. Register it in `PRODUCTS` (`src/data/products.ts`) with an `id` slug, `policyType`,
   `firstQuestionId`, `calculate`, and `intro`.
4. Add `src/app/(protected)/new-quote/<slug>/page.tsx` rendering `<QuoteExperience productId="<slug>" />`,
   and link it from the category picker.
5. The shared engine, persistence (`allAnswers` JSON), detail page, PDF, and email work without further changes.

> See the in-chat input reference and operator list in `docs/QUICK_REFERENCE.md`.
