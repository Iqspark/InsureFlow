# CLAUDE.md

Behavioral guidelines and project context for Claude Code working on InsureFlow.

---

## Project: InsureFlow — Multi-Product Insurance Broker Portal

**Stack:** Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS · Framer Motion · NextAuth v4 · Prisma 5 · PostgreSQL (Neon) · OpenAI gpt-4o-mini · Nodemailer · @react-pdf/renderer · Google Maps · Vitest · PWA (next-pwa)

**What it does:** A chat-style insurance quoting tool for brokers. Brokers log in and walk an applicant through a conversational questionnaire (virtual broker "Alex"), getting an instant Accept / Decline / Refer decision with a premium breakdown. A calculated quote is saved; pressing **Buy This Policy** binds it as a **policy** (emails the applicant + notifies the underwriter). Two products ship today — **Vacant Home Insurance** and **Jeweller's Block** — via a product registry; the chat engine, persistence, PDF, and result UI are shared. Vacant Home captures the address (Google Places autocomplete, province auto-derived) and shows a map; any quote/policy can be downloaded as a branded PDF. Installs as a PWA.

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

**Demo login:** `broker@demo.com` / `Demo1234!`

---

## Key Files

| What | Where |
|---|---|
| Product registry (slug → questions/calculator/label) | `src/data/products.ts` |
| Vacant Home questions, branching, UW rules | `src/data/questions.ts` |
| Vacant Home pricing multipliers | `src/data/ratingFactors.ts` |
| Jeweller's Block questions + UW rules | `src/data/jewellerQuestions.ts` |
| Jeweller's Block pricing factors | `src/data/jewellerRatingFactors.ts` |
| Quote calculators | `src/engine/quoteCalculator.ts`, `src/engine/jewellerQuoteCalculator.ts` |
| Underwriting engine (takes a questions array) | `src/engine/underwritingEngine.ts` |
| Conversation state (phases, answer-preservation/edit) | `src/context/QuoteContext.tsx` |
| Shared quote shell (both products) | `src/components/QuoteExperience.tsx` |
| Chat UI + change-answer input | `src/components/ConversationView.tsx` |
| Review screen with per-answer Edit buttons | `src/components/SummaryScreen.tsx` |
| Vertical progress rail | `src/components/QuestionProgressRail.tsx` |
| Result screens (Accept/Decline/Refer) + Buy | `src/components/QuoteResult.tsx`, `src/components/BuyPolicyButton.tsx` |
| Inputs (incl. address autocomplete) | `src/components/inputs/*` |
| Saved quote/policy detail + map + PDF/Buy | `src/app/(protected)/policy/[id]/page.tsx`, `src/components/PropertyMap.tsx` |
| PDF document (react-pdf) + section builder | `src/lib/policyPdf.tsx`, `src/lib/submissionSections.ts` |
| Email (applicant + underwriter) | `src/lib/email.ts` |
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
OPENAI_API_KEY="sk-..."                      # Help Navigator + change-answer
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."        # address autocomplete + maps (build-time)
```

Optional email (leave `SMTP_PASS` blank to use the Ethereal test inbox):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=                                    # Gmail App Password for real delivery
SMTP_FROM="InsureFlow <you@gmail.com>"
UNDERWRITER_EMAIL=underwriting@yourco.com     # notified when a policy is bound
```

---

## Architecture Notes

- **Multi-product:** `src/data/products.ts` maps a slug (`vacant-home`, `jeweller-block`) to its questions, `firstQuestionId`, calculator, and policy label. `QuoteProvider` takes a `productId`; the engine/persistence/PDF are product-agnostic. Non-Vacant-Home products store their answers in the `allAnswers` JSON column (no per-product DB columns).
- **Answer preservation:** editing an earlier answer re-walks the path, keeps still-reachable answers, and prunes answers from abandoned branches only once the path is fully answered (so phone/email aren't lost when an edit adds a question mid-flow). See `walkAnsweredPath` in `QuoteContext.tsx`.
- **Quote vs Policy:** a saved submission is a quote; `purchased=true` (set by `/api/buy-policy`) marks it a bound policy. Bound policies are protected from deletion (`/api/submissions/[id]` returns 409).
- **Route groups:** `(auth)` = no header/footer (login); `(protected)` = auth-guarded, has Header + Footer + HelpChatWidget
- **Database:** PostgreSQL (Neon). `DATABASE_URL` is a Postgres connection string. Apply schema with `npx prisma db push`.
- **Broker isolation:** Every submission is tagged with `brokerId` from the session. All queries filter by `brokerId`.
- **Non-blocking DB save:** Quote result is shown immediately; DB save happens async in the background. `submissionId` is set via `useRef`/`useEffect` to avoid stale closure bugs.
- **AI features need `OPENAI_API_KEY`:** Both `/api/help-chat` and `/api/chat-intent` use `gpt-4o-mini`. Without the key, the features show a "not configured" message.
- **Knowledge base:** Server reads all `.md`/`.txt` from `knowledge/` on each Help Navigator request. No restart needed when files change.
- **Email:** Without SMTP vars, Nodemailer auto-creates an Ethereal test account. The `previewUrl` is returned by `/api/buy-policy` and shown as a button in the UI.

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