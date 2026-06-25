# CLAUDE.md

Behavioral guidelines and project context for Claude Code working on InsureFlow.

---

## Project: InsureFlow — Multi-Product Insurance Broker Portal

**Stack:** Next.js 16 (App Router, React 19) · TypeScript 5 · Tailwind CSS · Framer Motion · NextAuth v4 · Prisma 5 · PostgreSQL (Neon) · OpenAI gpt-4o-mini · Stripe Checkout · Resend/Nodemailer · @react-pdf/renderer · Google Maps · Sentry · Vitest · PWA (next-pwa)

> **Note:** App Router route handlers and pages use async params — `params: Promise<{…}>` with `const { x } = await params` (Next.js 16 / React 19).

**What it does:** A chat-style insurance quoting tool for brokers. Brokers log in and walk an applicant through a conversational questionnaire (virtual broker "Alex"), getting an instant Accept / Decline / Refer decision with a premium breakdown. A calculated quote is saved; pressing **Buy This Policy** binds it as a **policy** and emails the applicant a **payment link** to a public checkout. Checkout is **real Stripe (hosted Checkout)** when `STRIPE_SECRET_KEY` is set, with a simulated-card flow as a fallback only when Stripe is not configured (the simulated route returns 400 once Stripe is live). The applicant can also self-serve from a **customer portal** (`/portal/<token>`) to view their policy, download the PDF, pay, and request changes. Multiple products ship via a product registry (Vacant Home, Jeweller's Block, and more); the chat engine, persistence, PDF, and result UI are shared. Vacant Home captures the address (Google Places autocomplete, province auto-derived) and shows a map; any quote/policy can be downloaded as a branded PDF. Installs as a PWA.

**Roles (RBAC):** three user roles — **Admin** (full access + user management at `/admin`), **Broker** (own quotes/policies only), and **Underwriter** (reviews referred quotes from all brokers at `/review`, marking them Approved/Declined). Role rules live in `src/lib/access.ts`; the `Broker` model carries `role` + `active`. When an underwriter approves a referral the broker is emailed and it appears in their dashboard's **Action Required**.

---

## Running the App

```bash
npm run dev          # http://localhost:3000  (PWA disabled in dev)
npm run db:seed      # Create demo broker(s) (run once after setup)
npx prisma db push   # Apply schema (no migration history; dev + the CI pipeline)
npx prisma generate  # Regenerate client after schema changes
npx prisma studio    # Visual DB browser at http://localhost:5555
npm test             # Run the Vitest unit suite (engines + utils)
npm run build && npm start   # Production build (needed to exercise the PWA)
```

**Demo logins** (all `Demo1234!`): `admin@demo.com` (Admin) · `underwriter@demo.com` (Underwriter) · `broker@demo.com` (Broker)

---

## Key Files

| What | Where |
|---|---|
| Product registry (slug → questions/calculator/label) | `src/data/products.ts` |
| Vacant Home questions, branching, UW rules | `src/data/questions.ts` |
| Vacant Home pricing multipliers | `src/data/ratingFactors.ts` |
| Jeweller's Block questions + UW rules | `src/data/jewellerQuestions.ts` |
| Jeweller's Block pricing factors | `src/data/jewellerRatingFactors.ts` |
| Quote calculators | `src/engine/quoteCalculator.ts`, `src/engine/jewellerQuoteCalculator.ts`, `src/engine/farmQuoteCalculator.ts`, … |
| Underwriting engine (takes a questions array) | `src/engine/underwritingEngine.ts` |
| Conversation state (phases, answer-preservation/edit) | `src/context/QuoteContext.tsx` |
| Shared quote shell (both products) | `src/components/QuoteExperience.tsx` |
| Chat UI + change-answer input | `src/components/ConversationView.tsx` |
| Review screen with per-answer Edit buttons | `src/components/SummaryScreen.tsx` |
| Vertical progress rail | `src/components/QuestionProgressRail.tsx` |
| Result screens (Accept/Decline/Refer) + Buy | `src/components/QuoteResult.tsx`, `src/components/BuyPolicyButton.tsx` |
| Inputs (incl. address autocomplete) | `src/components/inputs/*` |
| Saved quote/policy detail + map + PDF/Buy | `src/app/(protected)/policy/[id]/page.tsx`, `src/components/PropertyMap.tsx` |
| Role access rules (RBAC) | `src/lib/access.ts` (+ tests `src/lib/access.test.ts`) |
| Underwriter review queue + action | `src/app/(protected)/review/page.tsx`, `src/components/ReviewActions.tsx`, `src/app/api/submissions/[id]/review/route.ts` |
| AI underwriter recommendation (advisory) | `src/lib/aiUnderwriter.ts`, `src/app/api/submissions/[id]/ai-review/route.ts` |
| Farm Insurance questions + UW rules | `src/data/farmQuestions.ts` |
| Farm Insurance pricing factors | `src/data/farmRatingFactors.ts` |
| Admin overview + user management | `src/app/(protected)/admin/page.tsx`, `admin/users/page.tsx`, `src/components/admin/UserManager.tsx`, `src/app/api/admin/users/*` |
| Customer payment (public) | `src/app/pay/[token]/page.tsx`, `src/app/api/pay/[token]/route.ts`, `src/components/PaymentForm.tsx` |
| Stripe Checkout (real, hosted) | `src/lib/stripe.ts`, `src/app/api/pay/[token]/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts` |
| Shared idempotent paid finalizer | `src/lib/finalizePayment.ts` (`finalizePaidPolicy`) |
| Customer self-service portal (public, token) | `src/app/portal/[token]/page.tsx`, `src/app/api/portal/[token]/document/route.ts`, `src/app/api/portal/[token]/request/route.ts` |
| Public-link token expiry (30-day TTL) | `src/lib/portalToken.ts` |
| Rate limiting (in-memory, public routes) | `src/lib/rateLimit.ts` |
| Observability (Sentry, money path) | `src/lib/observability.ts` (`captureError`) |
| Audit trail (`AuditEvent` log) | `src/lib/audit.ts` (`recordAudit`) |
| Policy number (`PREFIX-YEAR-CODE`) | `src/utils/policyNumber.ts` |
| PDF document (react-pdf) + builder | `src/lib/policyDocument.ts` (`buildPolicyPdf`), `src/lib/policyPdf.tsx`, `src/lib/submissionSections.ts` |
| Email (Resend → SMTP → Ethereal) | `src/lib/email.ts` (`deliver`) |
| Section labels (summary + progress rail) | `src/utils/sections.ts` |
| Google Maps loader / static map | `src/utils/googleMaps.ts` |
| Auth config | `src/lib/auth.ts` |
| Database schema | `prisma/schema.prisma` |
| Demo broker seed | `prisma/seed.js` |
| Unit tests | `src/**/*.test.ts` (Vitest, config in `vitest.config.ts`) |
| Help Navigator FAQ docs | `knowledge/` folder (`.md` or `.txt` files) |

---

## Environment Variables

Required in `.env` (project root) — see `.env.example`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"   # Neon/Postgres
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"        # must match the URL you load
OPENAI_API_KEY="sk-..."                      # Help Navigator + change-answer + AI underwriter
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."        # address autocomplete + maps (build-time)
```

Optional payments (real Stripe Checkout — falls back to simulated card when absent):
```
STRIPE_SECRET_KEY=sk_test_...                 # enables real hosted Stripe Checkout
STRIPE_WEBHOOK_SECRET=whsec_...               # verifies the /api/stripe/webhook signature
```

Optional email (Resend preferred → SMTP → Ethereal test inbox if none set):
```
RESEND_API_KEY=re_...                          # transactional email (preferred); needs a verified domain
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=                                    # Gmail App Password for real delivery
SMTP_FROM="InsureFlow <you@gmail.com>"
UNDERWRITER_EMAIL=underwriting@yourco.com     # notified when a policy is bound
```

Optional observability:
```
SENTRY_DSN=https://...                         # money-path error capture (console-only without it)
```

---

## Architecture Notes

- **Multi-product:** `src/data/products.ts` maps a slug (`vacant-home`, `jeweller-block`, `farm`, plus cyber, contractor, architects-engineers, retailers, rental-home, personal-items, lithium-batteries) to its questions, `firstQuestionId`, calculator, and policy label. `QuoteProvider` takes a `productId`; the engine/persistence/PDF are product-agnostic. Non-Vacant-Home products store their answers in the `allAnswers` JSON column (no per-product DB columns). **Farm Insurance** mirrors the paper application's modules (General Information, Locations, Habitational, Farm Buildings, Machinery & Equipment, Livestock, Earnings & Profits, Tank Data, Liability, Loss History, Property & Coverage, Broker Information) as conversational sections — see `farmQuestions.ts`.
- **Answer preservation:** editing an earlier answer re-walks the path, keeps still-reachable answers, and prunes answers from abandoned branches only once the path is fully answered (so phone/email aren't lost when an edit adds a question mid-flow). See `walkAnsweredPath` in `QuoteContext.tsx`.
- **Quote → bind → pay → adjust/cancel:** a saved submission is a quote; `purchased=true` (set by `/api/buy-policy`) marks it a bound policy with a 12-month term; `paymentStatus="paid"` marks it paid. Buying emails the applicant tokenised `/pay/<token>` + `/portal/<token>` links rather than charging the broker. A paid policy can be **adjusted** (MTA, pro-rata) or **cancelled** mid-term. Bound policies are protected from deletion (`/api/submissions/[id]` returns 409). **Every money action emails the customer and writes an `AuditEvent`** (`recordAudit`).
- **Payments (Stripe):** when `STRIPE_SECRET_KEY` is set, `POST /api/pay/[token]/checkout` creates a hosted Stripe Checkout Session (CAD line item = product + policy number, stores `stripeSessionId`). The **authoritative paid signal** is `POST /api/stripe/webhook`: it verifies the signature (`STRIPE_WEBHOOK_SECRET`), **dedups** via the `WebhookEvent` table (event id PK), **checks the amount** against `annualPremium`, then calls `finalizePaidPolicy`. A confirm-on-return safety net on `/pay/<token>?paid=1` retrieves the session and finalizes if Stripe says paid (covers a dropped/delayed webhook). `finalizePaidPolicy()` (`src/lib/finalizePayment.ts`) is the single **idempotent** finalizer — sets `paymentStatus=paid`/`paidAt`/`paidAmount` (+ stripe fields), audits `paid`, and emails confirmation + receipt (receipt has a branded policy PDF attached, best-effort). Without Stripe, the simulated `POST /api/pay/[token]` (format-validated card, no charge) is used; it returns **400** when Stripe is configured.
- **Customer portal (public, token):** `/portal/<token>` (no login) shows a read-only policy view (status, premium/coverage/term, map, details, PDF download), a pay CTA if unpaid, and a "Request a Change" form. `GET /api/portal/[token]/document` serves the PDF; `POST /api/portal/[token]/request` logs a `change_requested` audit and emails the broker.
- **Public-link token expiry:** `paymentTokenExpiresAt` (30-day TTL via `src/lib/portalToken.ts`; legacy null = never expires) is refreshed on bind/resend. Expired links → portal page shows "link expired", API routes return **410**.
- **Security:** in-memory fixed-window rate limiting (`src/lib/rateLimit.ts`) on public routes (pay/checkout/webhook/portal request); webhook signature verify + `WebhookEvent` dedup + amount verification.
- **Observability:** `src/lib/observability.ts` `captureError(err, { area, … })` always logs to console and sends to Sentry only when `SENTRY_DSN` is set; wired across the money path (buy-policy, checkout, webhook, pay, finalize, adjust, cancel, review, portal request).
- **Policy numbers:** `src/utils/policyNumber.ts` derives a stable `{PREFIX}-{YEAR}-{CODE}` (e.g. `VH-2026-7K3M9Q`) from immutable fields, shown consistently in UI, PDF, emails, and the Stripe line item.
- **Underwriter review:** referred quotes (`decision="refer"`) are decided in `/review` via `/api/submissions/[id]/review` (approve→accept / decline), which stamps `reviewedBy/At/Note` and emails the broker on approval.
- **AI underwriter (advisory):** in `ReviewActions`, "Get AI Recommendation" → `POST /api/submissions/[id]/ai-review` (admin/underwriter only, refer-only) returns a typed verdict — `approve`/`decline` + confidence + reasons — that pre-fills the review note; the human still confirms. The engine is **pluggable** via the `UnderwriterEngine` interface in `src/lib/aiUnderwriter.ts`; the active engine is an inline OpenAI call (`gpt-4o-mini`, JSON output, funded by `OPENAI_API_KEY`). A future Anthropic Agent-Skill engine (PDF + code execution) can be dropped in by swapping `activeEngine` without touching the route or UI. Gated by `isAiUnderwriterConfigured()` — returns `503` "not configured" without the key.
- **Route groups:** `(auth)` = no header/footer (login); `(protected)` = auth-guarded, role-aware Header + Footer + HelpChatWidget. The customer `pay/[token]` and `portal/[token]` pages live at the top level (public, root layout, no login).
- **Activity timeline:** the broker policy detail page shows an "Activity" timeline rendered from `AuditEvent` rows.
- **Database:** PostgreSQL (Neon). `DATABASE_URL` is a Postgres connection string. Apply schema with `npx prisma db push`.
- **Role-based access:** every list/detail/search/buy query goes through `src/lib/access.ts`. Brokers are scoped to their own `brokerId`; admins/underwriters see all. Use `requireRole(session, [...])` to guard server pages and `submissionScopeWhere(user)` for queries.
- **Non-blocking DB save:** Quote result is shown immediately; DB save happens async in the background. `submissionId` is set via `useRef`/`useEffect` to avoid stale closure bugs.
- **AI features need `OPENAI_API_KEY`:** `/api/help-chat`, `/api/chat-intent`, and the AI underwriter (`/api/submissions/[id]/ai-review`) all use `gpt-4o-mini`. Without the key, the features show a "not configured" message.
- **Knowledge base:** Server reads all `.md`/`.txt` from `knowledge/` on each Help Navigator request. No restart needed when files change.
- **Email:** `deliver()` in `src/lib/email.ts` prefers Resend (`RESEND_API_KEY`), then SMTP (`SMTP_USER`/`PASS`), then an auto-created Ethereal test account (returns a `previewUrl` surfaced as a button in the UI). Senders: payment-request (pay + portal links), policy-confirmation, payment-receipt (branded PDF attached), quote-approved (broker), underwriter-notification, adjustment, cancellation, change-request (broker).

---

## Coding Guidelines

### Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so.

### Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

- Don't improve adjacent code, comments, or formatting unless asked.
- Don't refactor things that aren't broken.
- Match existing style.
- Every changed line should trace directly to the user's request.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.

### Comments

- Default to no comments. Only add one when the WHY is non-obvious.
- Never write multi-line comment blocks or docstrings.

### Goal-Driven Execution

For multi-step tasks, state a brief plan before starting:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Adding a New Question (Quick Steps)

1. Add object to `QUESTIONS` array in `src/data/questions.ts`
2. Wire `defaultNextQuestionId` on previous question to new question's `id`
3. Set new question's `defaultNextQuestionId` to the next question (or `"__SUBMIT__"` if last)
4. If it affects pricing: add factor table to `src/data/ratingFactors.ts`, add handler in `src/engine/quoteCalculator.ts`
5. If it has UW rules: add `underwritingRules` array on the question object

See `docs/QUICK_REFERENCE.md` for operator reference and input type reference.



Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---