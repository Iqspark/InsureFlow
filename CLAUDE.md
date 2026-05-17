# CLAUDE.md

Behavioral guidelines and project context for Claude Code working on InsureFlow.

---

## Project: InsureFlow — Vacant Home Insurance Broker Portal

**Stack:** Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS · Framer Motion · NextAuth v4 · Prisma 5 · SQLite (dev) · OpenAI gpt-4o-mini · Nodemailer

**What it does:** A chat-style insurance quoting tool for brokers. Brokers log in, walk an applicant through a conversational questionnaire, and get an instant Accept / Decline / Refer decision with a premium breakdown. Accepted quotes can be bound via a "Buy This Policy" button that sends a confirmation email.

---

## Running the App

```bash
npm run dev          # http://localhost:3000
npm run db:seed      # Create demo broker (run once after setup)
npx prisma db push   # Apply schema without migration history (dev only)
npx prisma generate  # Regenerate client after schema changes
npx prisma studio    # Visual DB browser at http://localhost:5555
```

**Demo login:** `broker@demo.com` / `Demo1234!`

---

## Key Files

| What | Where |
|---|---|
| Questions, branching, UW rules | `src/data/questions.ts` |
| Pricing multipliers | `src/data/ratingFactors.ts` |
| Quote calculator | `src/engine/quoteCalculator.ts` |
| Underwriting engine | `src/engine/underwritingEngine.ts` |
| All cross-component state | `src/context/QuoteContext.tsx` |
| Chat UI + change-answer input | `src/components/ConversationView.tsx` |
| Result screens (Accept/Decline/Refer) | `src/components/QuoteResult.tsx` |
| Help Navigator widget | `src/components/HelpChatWidget.tsx` |
| Email sending | `src/lib/email.ts` |
| Auth config | `src/lib/auth.ts` |
| Database schema | `prisma/schema.prisma` |
| Demo broker seed | `prisma/seed.js` |
| Help Navigator FAQ docs | `knowledge/` folder (`.md` or `.txt` files) |

---

## Environment Variables

Required in `.env` (project root):

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-insureflow-change-this-in-production-32c"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-proj-..."
```

Optional (leave commented out to use Ethereal test email):
```
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-gmail@gmail.com
# SMTP_PASS=your-16-char-app-password
# SMTP_FROM="InsureFlow <noreply@insureflow.com>"
```

---

## Architecture Notes

- **Route groups:** `(auth)` = no header/footer (login); `(protected)` = auth-guarded, has Header + Footer + HelpChatWidget
- **Database path:** `DATABASE_URL="file:./prisma/dev.db"` — path is relative to project root. DB file lives at `prisma/dev.db`.
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