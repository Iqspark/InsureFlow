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
| Framework | Next.js (App Router) | 14 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | v3 |
| Animation | Framer Motion | v11 |
| Auth | NextAuth.js | v4 (JWT, Credentials) |
| ORM | Prisma | 5 |
| Database | PostgreSQL | — |
| Email | Nodemailer + Ethereal | — |
| PDF | `@react-pdf/renderer` | — |
| Maps | Google Maps JS + Static/Embed APIs | — |
| AI | OpenAI API | gpt-4o-mini |
| PWA | Web manifest + dynamic OG icons | — |
| State | React Context | — |

> Note: `prisma/schema.prisma` declares `provider = "postgresql"`. The README/CLAUDE notes that mention SQLite are out of date relative to the schema.

---

## Application Structure

```
src/
  app/
    (auth)/                 ← No header/footer/chrome (login only)
      login/page.tsx
    (protected)/            ← Auth-guarded; Header + Footer + HelpChatWidget
      layout.tsx            ← Server component; getServerSession → redirect("/login")
      dashboard/page.tsx    ← Broker's quote/policy list + stats
      new-quote/
        page.tsx            ← Category picker (most products "Coming Soon")
        vacant-home/page.tsx    ← <QuoteExperience productId="vacant-home" />
        jeweller-block/page.tsx ← <QuoteExperience productId="jeweller-block" />
      search/page.tsx       ← Search + delete quotes (bound policies protected)
      policy/[id]/page.tsx  ← Detail view: banner, premium, map, PDF, buy/resume
      privacy/ terms/ support/  ← Static info pages
    api/
      auth/[...nextauth]/   ← NextAuth handler
      submissions/          ← POST (save complete quote) + GET (list)
      submissions/[id]/     ← DELETE (bound policies rejected with 409)
      drafts/               ← POST (upsert draft)
      drafts/[id]/          ← GET (load a draft for resume)
      buy-policy/           ← Bind policy + send confirmation + underwriter notice
      search/               ← Broker-scoped search
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
    Header / Footer / HelpChatWidget / PropertyMap / StageBadge / ...
  context/
    QuoteContext.tsx        ← All quote state + the conversational state machine
  data/
    products.ts             ← PRODUCTS registry, getProduct, productSlugForPolicyType
    questions.ts / ratingFactors.ts           ← Vacant Home flow + factors
    jewellerQuestions.ts / jewellerRatingFactors.ts ← Jeweller Block flow + factors
  engine/
    underwritingEngine.ts   ← Accept / Decline / Refer rule evaluation (shared)
    quoteCalculator.ts      ← Vacant Home premium
    jewellerQuoteCalculator.ts ← Jeweller Block premium
  lib/
    auth.ts                 ← NextAuth options (Credentials, JWT)
    prisma.ts               ← Prisma client singleton
    email.ts                ← Nodemailer + Ethereal fallback; two templates
    policyPdf.tsx           ← React-PDF document (renderPolicyPdf)
    submissionSections.ts   ← Builds detail sections (typed cols vs. generic JSON)
  utils/
    interpolate.ts          ← {{answer_id}} substitution in broker text
    sections.ts             ← Section labels + ordered section list
    validate.ts             ← Pure input validators
    googleMaps.ts           ← Lazy JS loader + embed/static map URLs
  middleware.ts             ← withAuth — guards /dashboard, /new-quote, /search

knowledge/                  ← FAQ + policy-wording docs for Help Navigator (.md/.txt/.pdf)
prisma/
  schema.prisma             ← Broker + Submission models (PostgreSQL)
  seed.js                   ← Creates demo broker account
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

Helpers:

- `getProduct(productId)` — returns the config, falling back to `DEFAULT_PRODUCT_ID` (`vacant-home`) for unknown ids.
- `productSlugForPolicyType(policyType)` — reverse lookup used by the detail page's "Resume Quote" link to route a draft back to its product flow.

Each product page (`/new-quote/vacant-home`, `/new-quote/jeweller-block`) is a thin wrapper that renders `<QuoteExperience productId="…" />`. The category picker at `/new-quote` lists many categories; only Vacant Homes and Jeweller Block have live `href`s today — the rest render a "Coming Soon" badge.

---

## Authentication & Route Protection

1. `src/middleware.ts` (`withAuth`) guards `/dashboard/*`, `/new-quote/*`, `/search/*` — no token → redirect to `/login`. An optional `SESSION_VERSION` env var invalidates stale dev sessions.
2. The `(protected)` layout *also* calls `getServerSession(authOptions)` and `redirect("/login")` server-side as a second gate (and covers `/policy/*`, which isn't in the middleware matcher).
3. Login posts to NextAuth's Credentials provider (`src/lib/auth.ts`), which looks up the `Broker` by email and verifies the password with `bcrypt.compare`.
4. On success a signed JWT (8-hour `maxAge`) is issued; `id` and `name` are copied onto the token and surfaced on `session.user`.
5. API route handlers individually call `getServerSession(authOptions)` and return `401` when there's no session.

### Demo credentials

```
Email:    broker@demo.com
Password: Demo1234!
```

Run `npm run db:seed` to create this account.

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

"Buy This Policy" (AcceptResult)
   └─ handleBuyPolicy(): waits up to 3s for submissionId (ref poll)
        POST /api/buy-policy { submissionId }
            → verify session + brokerId ownership
            → decision must be "accept"
            → sendPolicyConfirmationEmail() → set purchased = true
            → optional sendUnderwriterNotificationEmail() (if UNDERWRITER_EMAIL set)
            → { success, sentTo, previewUrl, underwriterNotified }
        → success screen (email chip + optional Ethereal preview link)
```

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
- **Broker isolation** — every detail/search/PDF/buy query filters or checks
  `brokerId === session.user.id`. `DELETE /api/submissions/[id]` refuses to delete a
  `purchased` (bound) policy with `409`. The search page can delete quotes but bound policies
  are protected.

---

## PDF Generation

`GET /api/policy/[id]/document` (Node runtime) authorizes the broker, optionally fetches a
Google **Static Maps** PNG and inlines it as a base64 data URI, builds the detail sections via
`buildSubmissionSections`, and calls `renderPolicyPdf` (`src/lib/policyPdf.tsx`,
`@react-pdf/renderer`) to stream an `application/pdf` attachment. This is pure Node — no
headless browser.

`buildSubmissionSections` (`src/lib/submissionSections.ts`) is product-aware: Vacant Home
renders from typed columns; other products (Jeweller Block) render generically from the
`allAnswers` JSON, grouped by each question's `summarySection` and labeled by `summaryLabel`.
The same builder feeds the on-screen detail page (`policy/[id]/page.tsx`) and the PDF.

---

## Email Flow

`src/lib/email.ts` builds a Nodemailer transport: real SMTP when `SMTP_USER` + `SMTP_PASS`
are set, otherwise an auto-created **Ethereal** test account that returns a browser
`previewUrl`. It exposes two templated senders:

- `sendPolicyConfirmationEmail` — applicant-facing confirmation (premium summary, app id,
  next steps). Sent by `/api/buy-policy`, which then sets `purchased = true`.
- `sendUnderwriterNotificationEmail` — best-effort back-office notice, only when
  `UNDERWRITER_EMAIL` is set; failures never block the bind.

The Accept result screen shows the recipient and, in Ethereal mode, an "Open confirmation
email" button (`previewUrl`).

---

## AI Features

Both use `gpt-4o-mini` and short-circuit with a "not configured" message when
`OPENAI_API_KEY` is missing.

### Help Navigator — `POST /api/help-chat`

`HelpChatWidget` (floating, on every protected page). On each request the server reads every
`.md`/`.txt`/`.pdf` in `knowledge/` (skipping `README`, capped at `KB_CHAR_LIMIT`), parses
PDFs via `pdf-parse`, and injects them as system context alongside a portal description. It is
tuned to answer insurance policy-wording questions and only declines truly unrelated topics.
No restart is needed when knowledge files change.

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
