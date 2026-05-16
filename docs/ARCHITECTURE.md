# Architecture Guide

This document explains how the application is structured — components, state management, data flow, and the animation system — so you can confidently extend or modify any part of it.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [The Four Phases](#the-four-phases)
3. [Component Tree](#component-tree)
4. [State Management — QuoteContext](#state-management--quotecontext)
5. [Data Flow Diagram](#data-flow-diagram)
6. [The Conversation Loop (Step by Step)](#the-conversation-loop-step-by-step)
7. [Routing & Conditional Logic](#routing--conditional-logic)
8. [Animation System](#animation-system)
9. [Input Types & When to Use Each](#input-types--when-to-use-each)
10. [Adding a New Question Type](#adding-a-new-question-type)
11. [Adding a New Phase](#adding-a-new-phase)

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR-ready, file-based routing, RSC compatible |
| Language | TypeScript | Full type safety — especially important for the data layer |
| Styling | Tailwind CSS v3 | Utility-first, no extra CSS files needed |
| Animation | Framer Motion v11 | Declarative enter/exit animations, `AnimatePresence` for phase transitions |
| State | React Context + `useState` / `useCallback` | Simple enough for this flow; no Redux overhead |

---

## The Four Phases

The app is a linear state machine. `AppPhase` (defined in `src/types/index.ts`) is the top-level switch:

```
"intro"  →  "conversation"  →  "summary"  →  "result"
```

`src/app/page.tsx` renders a different component for each phase, wrapped in Framer Motion's `<AnimatePresence mode="wait">` so that exiting and entering screens animate without overlap.

```tsx
// src/app/page.tsx (simplified)
{phase === "intro"        && <IntroScreen />}
{phase === "conversation" && <ConversationView />}
{phase === "summary"      && <SummaryScreen />}
{phase === "result"       && <QuoteResult />}
```

Phase transitions are triggered by:

| From | To | Trigger |
|---|---|---|
| `intro` | `conversation` | User clicks "Get my free quote" |
| `conversation` | `summary` | The last question routes to `__SUBMIT__` |
| `summary` | `result` | User clicks "Calculate My Quote" |

---

## Component Tree

```
<QuoteProvider>            ← Global state: answers, phase, routing
  <AppShell>               ← Framed card (max-w-md, phone height)
    <AnimatePresence>
      │
      ├── <IntroScreen>            ← Phase: intro
      │
      ├── <ConversationView>       ← Phase: conversation
      │     ├── Top bar (avatar + "Online" badge)
      │     ├── <ProgressBar>
      │     ├── Chat scroll area
      │     │     ├── <ChatBubble type="broker"> × N  (history)
      │     │     ├── <ChatBubble type="user">   × N  (history)
      │     │     └── <TypingIndicator>            (transient)
      │     └── Input area
      │           ├── Helper text (optional)
      │           └── <InputRenderer>
      │                 └── one of:
      │                       <ChoiceInput>
      │                       <ToggleInput>
      │                       <TextInput>
      │                       <NumberInput>
      │                       <CurrencyInput>
      │                       <DropdownInput>
      │                       <DateInput>
      │
      ├── <SummaryScreen>          ← Phase: summary
      │
      └── <QuoteResult>            ← Phase: result
            ├── <AcceptResult>
            ├── <DeclineResult>
            └── <ReferResult>
```

---

## State Management — QuoteContext

All cross-component state lives in `src/context/QuoteContext.tsx`.

### State Variables

| Variable | Type | Description |
|---|---|---|
| `phase` | `AppPhase` | Current screen |
| `answers` | `Record<string, Answer>` | Map of `questionId → { value, displayValue }` |
| `currentQuestionId` | `string` | Which question the user is currently on |
| `questionHistory` | `string[]` | Ordered list of question IDs visited (enables "Go back") |
| `conversationMessages` | `ConversationMessage[]` | All broker + user messages shown in the chat |
| `quoteDetails` | `QuoteDetails \| null` | Populated after "Calculate My Quote" is clicked |

### Key Functions

| Function | What it does |
|---|---|
| `startConversation()` | Sets phase → `"conversation"` |
| `submitAnswer(id, value, displayValue)` | Saves the answer, adds user message, resolves next question |
| `addBrokerMessage(text, questionId)` | Called by `ConversationView` after the typing delay |
| `goBack()` | Rewinds to previous question, removes last messages and answer |
| `confirmSummary()` | Calls `calculateQuote()`, sets phase → `"result"` |
| `restart()` | Resets all state to initial values |

### Routing Logic (inside `resolveNextQuestionId`)

```typescript
function resolveNextQuestionId(questionId, value, answers) {
  const question = QUESTIONS.find(q => q.id === questionId);

  // 1. Check conditional branches first
  for (const branch of question.conditionalBranches ?? []) {
    const compareValue = branch.when.questionId
      ? answers[branch.when.questionId]?.value   // compare a different question's answer
      : value;                                    // compare this answer
    if (compareValue === branch.when.value) {
      return branch.nextQuestionId;
    }
  }

  // 2. Fall back to default
  return question.defaultNextQuestionId ?? "__SUBMIT__";
}
```

The special string `"__SUBMIT__"` signals the end of the questionnaire.

---

## Data Flow Diagram

```
USER CLICKS ANSWER
       │
       ▼
QuoteContext.submitAnswer(questionId, value, displayValue)
  │
  ├─ 1. Saves answer to answers[questionId]
  ├─ 2. Appends user ChatBubble to conversationMessages
  ├─ 3. Calls resolveNextQuestionId() → nextId
  └─ 4. If nextId === "__SUBMIT__"  → phase = "summary"
        Else                        → currentQuestionId = nextId

ConversationView (effect fires on currentQuestionId change)
  │
  ├─ 1. setShowTyping(true)  → TypingIndicator appears
  ├─ 2. Wait 1,100 ms
  ├─ 3. interpolate(question.brokerText, answers) → broker text
  ├─ 4. addBrokerMessage(text, questionId) → broker ChatBubble appears
  ├─ 5. setShowTyping(false)
  └─ 6. setInputReady(true) → InputRenderer appears

USER CLICKS "Calculate My Quote" (on SummaryScreen)
  │
  ▼
QuoteContext.confirmSummary()
  │
  ├─ calculateQuote(answers)
  │     └─ runUnderwritingEngine(answers)  → decision
  │     └─ apply all rating factors        → finalAnnualPremium
  │
  └─ setQuoteDetails(result)
     setPhase("result")
```

---

## The Conversation Loop (Step by Step)

The timing choreography in `ConversationView` creates the "broker is typing" feel:

```
t = 0ms    currentQuestionId changes
           setShowTyping(true)   → TypingIndicator fades in
           setInputReady(false)  → previous input unmounts

t = 1100ms interpolate broker text with current answers
           addBrokerMessage(text, questionId) → broker bubble animates in
           setShowTyping(false)  → TypingIndicator fades out
           setInputReady(true)   → InputRenderer slides up
```

The 1,100 ms delay is defined at the top of `ConversationView.tsx` as `TYPING_DELAY_MS`. Adjust this to taste — 800 ms feels snappy, 1,500 ms feels more conversational.

---

## Routing & Conditional Logic

### Simple (linear) routing

```typescript
{
  id: "year_built",
  ...
  defaultNextQuestionId: "square_footage",   // Always go here
}
```

### Conditional routing (branching)

```typescript
{
  id: "has_pool",
  ...
  defaultNextQuestionId: "prior_damage",     // Default: skip pool question
  conditionalBranches: [
    {
      when: { operator: "equals", value: "yes" },
      nextQuestionId: "pool_fenced",         // Branch: show extra question
    },
  ],
}
```

### Comparing a different question's answer

You can branch based on an answer given earlier by specifying `questionId` in the `when` clause:

```typescript
conditionalBranches: [
  {
    when: {
      questionId: "property_state",   // Look at this earlier answer
      operator: "equals",
      value: "FL",
    },
    nextQuestionId: "hurricane_coverage",
  },
]
```

### Supported operators

| Operator | Meaning |
|---|---|
| `equals` | Exact match |
| `not_equals` | Does not match |
| `greater_than` | Numeric — actual > target |
| `less_than` | Numeric — actual < target |
| `greater_than_or_equal` | Numeric — actual ≥ target |
| `less_than_or_equal` | Numeric — actual ≤ target |
| `contains` | String — actual includes target |
| `in_list` | actual is one of the items in the target array |

---

## Animation System

All animations use **Framer Motion**. Each component declares its own `initial` / `animate` props, so animations are co-located with their component.

### Chat bubble entrance

```tsx
// ChatBubble.tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
```

### Input widget entrance

```tsx
// Each Input component
<motion.div
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
```

### Phase transitions (page-level)

```tsx
// page.tsx — AnimatePresence handles enter/exit
<motion.div
  initial={{ opacity: 0, x: 30 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -30 }}
>
```

### Typing indicator dots

Pure CSS animation defined in `tailwind.config.ts`:

```css
@keyframes bounce-dot {
  0%, 80%, 100% { transform: scale(0); opacity: 0.4 }
  40%           { transform: scale(1); opacity: 1   }
}
```

Each dot has a 160 ms staggered `animation-delay`.

### Adjusting timing

All animation durations are inline props — search for `transition={{ duration:` to find and adjust them. The typing delay is in `ConversationView.tsx`:

```typescript
const TYPING_DELAY_MS = 1100; // ← change this
```

---

## Input Types & When to Use Each

| Type | Component | Best for |
|---|---|---|
| `choice` | `ChoiceInput` | 2–6 labelled options (the "what type of property" pattern) |
| `toggle` | `ToggleInput` | Exactly 2 options: Yes/No, True/False, On/Off |
| `text` | `TextInput` | Names, email addresses, free-form strings |
| `number` | `NumberInput` | Year built, square footage — integer/decimal with min/max |
| `currency` | `CurrencyInput` | Dollar amounts — formats with commas, strips $ for the value |
| `dropdown` | `DropdownInput` | Long lists (e.g. US states) — includes a live search filter |
| `date` | `DateInput` | Calendar dates (uses the native `<input type="date">`) |

---

## Adding a New Question Type

1. Add the new type string to the `QuestionType` union in `src/types/index.ts`:

```typescript
export type QuestionType =
  | "choice" | "text" | "number" | "currency"
  | "toggle" | "dropdown" | "date"
  | "slider";   // ← new
```

2. Create `src/components/inputs/SliderInput.tsx` following the pattern of any existing input — accept an `onSubmit` prop and call it when the user confirms.

3. Add a case to `src/components/InputRenderer.tsx`:

```typescript
case "slider":
  return (
    <SliderInput
      min={question.min}
      max={question.max}
      onSubmit={(v, d) => submit(v, d)}
    />
  );
```

4. Use `type: "slider"` in any question in `src/data/questions.ts`.

---

## Adding a New Phase

If you need an extra step (e.g., a "payment" phase after the quote):

1. Add `"payment"` to `AppPhase` in `src/types/index.ts`.
2. Add a `setPhase("payment")` call wherever the transition should happen.
3. Create `src/components/PaymentScreen.tsx`.
4. Add the new `AnimatePresence` case in `src/app/page.tsx`.
