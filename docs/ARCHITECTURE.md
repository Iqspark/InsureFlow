# Architecture Guide

This document explains how the application is structured — authentication, components, state management, AI features, data flow, and the animation system — so you can confidently extend or modify any part of it.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Application Structure](#application-structure)
3. [Authentication & Route Protection](#authentication--route-protection)
4. [The Four Quote Phases](#the-four-quote-phases)
5. [Component Tree](#component-tree)
6. [State Management — QuoteContext](#state-management--quotecontext)
7. [AI Features](#ai-features)
8. [Email Flow](#email-flow)
9. [Data Flow Diagram](#data-flow-diagram)
10. [The Conversation Loop](#the-conversation-loop)
11. [Routing & Conditional Logic](#routing--conditional-logic)
12. [Animation System](#animation-system)
13. [Adding a New Question Type](#adding-a-new-question-type)

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | v3 |
| Animation | Framer Motion | v11 |
| Auth | NextAuth.js | v4 |
| ORM | Prisma | 5 |
| Database (dev) | SQLite | — |
| Email | Nodemailer + Ethereal | v7 |
| AI | OpenAI API | gpt-4o-mini |
| PWA | @ducanh2912/next-pwa | — |
| State | React Context | — |

---

## Application Structure

```
src/
  app/
    (auth)/               ← No header/footer (login page)
      login/page.tsx
    (protected)/          ← Header + footer + auth guard
      layout.tsx          ← Server component; checks session, renders HelpChatWidget
      dashboard/          ← Broker's policy list
      new-quote/          ← Insurance category picker
        vacant-home/      ← Full quote flow
      search/             ← Policy search
      policy/[id]/        ← Policy detail view
    api/
      auth/[...nextauth]/ ← NextAuth handler
      submissions/        ← Save quote + list submissions
      buy-policy/         ← Send confirmation email
      search/             ← Policy search API
      chat-intent/        ← AI: identify which answer to change
      help-chat/          ← AI: Help Navigator (knowledge base Q&A)
      analytics/          ← Aggregated statistics
    layout.tsx            ← Root layout (Providers, PWA meta)
    page.tsx              ← Redirects: logged-in → /dashboard, else → /login
  components/
    Header.tsx            ← Logo + broker name + sign-out
    Footer.tsx            ← Copyright + links
    HelpChatWidget.tsx    ← Floating AI chat button (bottom-right)
    ConversationView.tsx  ← Chat UI + "change an answer" input
    QuoteResult.tsx       ← Accept / Decline / Refer result screens
    SummaryScreen.tsx     ← Pre-confirmation review
    InputRenderer.tsx     ← Routes to correct input component
    inputs/               ← TextInput, NumberInput, CurrencyInput, etc.
  context/
    QuoteContext.tsx       ← All quote state + navigation functions
  lib/
    auth.ts               ← NextAuth options (Credentials provider)
    email.ts              ← Nodemailer + Ethereal fallback
    prisma.ts             ← Prisma client singleton
  data/
    questions.ts          ← All form questions
  engine/
    quoteCalculator.ts    ← Rating factors → final premium
    underwritingEngine.ts ← Decline / Refer rules
  types/
    index.ts              ← Shared TypeScript types
    next-auth.d.ts        ← Session type augmentation

knowledge/                ← Drop FAQ .md/.txt files here for Help Navigator
prisma/
  schema.prisma           ← Broker + Submission models
  seed.js                 ← Creates demo broker account
  dev.db                  ← SQLite database (dev only)
```

---

## Authentication & Route Protection

### How it works

1. Broker navigates to any protected route
2. `src/middleware.ts` (NextAuth `withAuth`) intercepts — redirects to `/login` if no session
3. Login page calls `signIn("credentials", { email, password })`
4. NextAuth verifies password with `bcryptjs.compare` against the hashed password in the `Broker` table
5. On success, a signed JWT is stored in a cookie (8-hour expiry)
6. Server components call `getServerSession(authOptions)` to read the session
7. Client components use the `useSession()` hook via `<SessionProvider>`

### Demo credentials

```
Email:    broker@demo.com
Password: Demo1234!
```

Run `npm run db:seed` to create this account.

### Protected routes

| Pattern | Protected by |
|---|---|
| `/dashboard/*` | Middleware + layout server check |
| `/new-quote/*` | Middleware |
| `/search/*` | Middleware |
| `/policy/*` | Middleware |
| `/api/submissions` | `getServerSession` in route handler |
| `/api/buy-policy` | `getServerSession` in route handler |
| `/api/search` | `getServerSession` in route handler |
| `/api/help-chat` | `getServerSession` in route handler |
| `/api/chat-intent` | `getServerSession` in route handler |

### Broker isolation

Every submission is saved with the broker's `id` from the session. All list and detail queries add `WHERE brokerId = session.user.id` — brokers cannot see each other's policies.

---

## The Four Quote Phases

The quote flow is a linear state machine. `AppPhase` is the top-level switch:

```
"intro" → "conversation" → "summary" → "result"
```

| From | To | Trigger |
|---|---|---|
| `intro` | `conversation` | "Get my free quote" button |
| `conversation` | `summary` | Last question routes to `__SUBMIT__` |
| `summary` | `result` | "Confirm & Get Quote" button → `confirmSummary()` |

When `result` shows an **Accept**, the broker can click **Buy This Policy** to send a confirmation email and see the success screen.

---

## Component Tree

```
<QuoteProvider>                   ← Global state
  <QuoteShell>                    ← Card frame (phone height)
    <AnimatePresence mode="wait">
      │
      ├── <IntroScreen>           ← phase: "intro"
      │
      ├── <ConversationView>      ← phase: "conversation"
      │     ├── Top bar (Alex avatar, "Online")
      │     ├── <ProgressBar>
      │     ├── Chat scroll area
      │     │     ├── <ChatBubble type="broker"> × N
      │     │     ├── <ChatBubble type="user">   × N
      │     │     └── <TypingIndicator>
      │     └── Input area
      │           ├── Helper text
      │           ├── <InputRenderer> → one of 7 input types
      │           ├── ← Go back button
      │           └── "Change an answer" AI input  ← NEW
      │
      ├── <SummaryScreen>         ← phase: "summary"
      │
      └── <QuoteResult>           ← phase: "result"
            ├── <AcceptResult>    ← success screen or buy flow
            ├── <DeclineResult>
            └── <ReferResult>

Protected layout (all pages):
  <Header>                        ← Logo + broker name + sign-out
  <main>{children}</main>
  <Footer>
  <HelpChatWidget>                ← Floating AI chat (bottom-right)  ← NEW
```

---

## State Management — QuoteContext

All cross-component state lives in `src/context/QuoteContext.tsx`.

### State Variables

| Variable | Type | Description |
|---|---|---|
| `phase` | `AppPhase` | Current screen |
| `answers` | `Record<string, Answer>` | Map of questionId → `{ value, displayValue }` |
| `currentQuestionId` | `string` | The question the user is currently on |
| `questionHistory` | `string[]` | Ordered list of question IDs visited |
| `conversationMessages` | `ConversationMessage[]` | All broker + user messages |
| `quoteDetails` | `QuoteDetails \| null` | Populated after confirmSummary() |
| `submissionId` | `string \| null` | DB record ID — set after async save completes |

### Functions

| Function | What it does |
|---|---|
| `startConversation()` | Sets phase → `"conversation"` |
| `submitAnswer(id, value, displayValue)` | Saves answer, adds user message, advances to next question |
| `addBrokerMessage(text, questionId)` | Appends a broker chat bubble (called after typing delay) |
| `goBack()` | Rewinds one question — removes last messages and answer |
| `goToQuestion(questionId)` | **NEW** — jumps directly to any past question; clears all answers and messages from that point forward |
| `confirmSummary()` | Calculates quote, sets phase → `"result"`, saves to DB (non-blocking) |
| `restart()` | Resets all state to initial values |

---

## AI Features

### 1. Help Navigator (floating chat widget)

**Component:** `src/components/HelpChatWidget.tsx`
**API:** `POST /api/help-chat`
**Model:** `gpt-4o-mini`

Reads every `.md` and `.txt` file from the `knowledge/` folder at the project root and uses them as the system context. If a question cannot be answered from the documents, the bot replies:
> "That's outside my scope — please contact your InsureFlow account manager for assistance."

**Adding documents:** drop any `.md` or `.txt` file into `knowledge/`. Changes are picked up on the next API call — no restart required.

### 2. Change-an-Answer (in conversation)

**Component:** `src/components/ConversationView.tsx` (bottom of input area)
**API:** `POST /api/chat-intent`
**Model:** `gpt-4o-mini`

Shown once at least one question has been answered. The broker types a natural-language request (e.g. *"change my province to Quebec"*). Claude identifies the question ID and the context calls `goToQuestion(questionId)`, rewinding the conversation to that point so the question can be re-answered.

**Required env var:** `OPENAI_API_KEY`

---

## Email Flow

1. Broker clicks **Buy This Policy** on the Accept result screen
2. `handleBuyPolicy()` in `QuoteResult.tsx` POSTs `{ submissionId }` to `/api/buy-policy`
3. The route verifies the session, looks up the submission (checking `brokerId`), and calls `sendPolicyConfirmationEmail()`
4. `email.ts` checks for `SMTP_USER` + `SMTP_PASS`:
   - **Set:** uses real SMTP (Gmail / Outlook)
   - **Not set:** auto-creates a free Ethereal test account; returns a `previewUrl` for the browser preview
5. The API responds with `{ success, sentTo, previewUrl }`
6. The UI swaps to the full-screen confirmation card showing the email address and (in Ethereal mode) an **"Open confirmation email"** button

---

## Data Flow Diagram

```
USER CLICKS ANSWER
       │
       ▼
QuoteContext.submitAnswer(questionId, value, displayValue)
  ├─ Saves answer to answers[questionId]
  ├─ Appends user ChatBubble to conversationMessages
  ├─ Resolves next question via conditionalBranches → defaultNextQuestionId
  └─ If "__SUBMIT__" → phase = "summary"
     Else            → currentQuestionId = nextId

USER CLICKS "Confirm & Get Quote"
  │
  ▼
QuoteContext.confirmSummary()
  ├─ calculateQuote(answers)     → quoteDetails
  ├─ setPhase("result")          → immediate (user sees result)
  └─ fetch POST /api/submissions → non-blocking DB save → setSubmissionId(id)

USER CLICKS "Buy This Policy" (Accept only)
  │
  ▼
handleBuyPolicy() in AcceptResult
  ├─ Waits up to 3 s for submissionId (ref-based polling)
  ├─ POST /api/buy-policy { submissionId }
  │     ├─ Verify session + brokerId ownership
  │     ├─ sendPolicyConfirmationEmail()
  │     └─ Returns { success, sentTo, previewUrl }
  └─ setBuyStatus("sent") → renders full-screen confirmation card
```

---

## The Conversation Loop

```
t = 0 ms      currentQuestionId changes
              setShowTyping(true)   → TypingIndicator fades in
              setInputReady(false)  → old input unmounts

t = 1100 ms   interpolate(question.brokerText, answers) → text
              addBrokerMessage(text, questionId) → broker bubble
              setShowTyping(false)  → TypingIndicator fades out
              setInputReady(true)   → InputRenderer slides up
```

Adjust the delay in `ConversationView.tsx`:
```typescript
const TYPING_DELAY_MS = 1100; // ← change this
```

---

## Routing & Conditional Logic

### Linear routing

```typescript
{ id: "year_built", defaultNextQuestionId: "square_footage" }
```

### Conditional branching

```typescript
{
  id: "has_pool",
  defaultNextQuestionId: "prior_damage",
  conditionalBranches: [
    { when: { value: "yes" }, nextQuestionId: "pool_fenced" },
  ],
}
```

### Operators

| Operator | Meaning |
|---|---|
| `equals` | Exact match |
| `not_equals` | Does not match |
| `greater_than` / `less_than` | Numeric comparison |
| `greater_than_or_equal` / `less_than_or_equal` | Numeric comparison |
| `contains` | String contains (case-insensitive) |
| `in_list` | Value is in an array |

### Ending the questionnaire

```typescript
{ id: "contact_email", defaultNextQuestionId: "__SUBMIT__" }
```

---

## Animation System

All animations use Framer Motion. Timings are inline props — search for `transition={{ duration:` to find them.

| Animation | Location |
|---|---|
| Chat bubble entrance | `ChatBubble.tsx` — `opacity 0→1, y 12→0` |
| Input widget entrance | Each input component — `opacity 0→1, y 14→0` |
| Phase transitions | `QuoteShell` — `AnimatePresence mode="wait"` |
| Typing dots | `TypingIndicator.tsx` — staggered `y` bounce |
| Buy policy checkmark | `QuoteResult.tsx` — `pathLength 0→1` spring |
| Help chat open/close | `HelpChatWidget.tsx` — `scale + y` ease |

---

## Adding a New Question Type

1. Add the type to `QuestionType` in `src/types/index.ts`
2. Create `src/components/inputs/MyInput.tsx` — accept `onSubmit(value, displayValue)` prop
3. Add a case in `src/components/InputRenderer.tsx`
4. Use `type: "my-type"` in `src/data/questions.ts`
