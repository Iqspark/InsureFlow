# Vacant Home Insurance — Conversational Quote App

A Lemonade-inspired, chat-style quoting application for Vacant Home Insurance built with **Next.js 14**, **Tailwind CSS**, and **Framer Motion**.

![App flow: Intro → Conversation → Summary → Quote Result](docs/assets/flow-diagram.txt)

---

## Table of Contents

1. [What This App Does](#what-this-app-does)
2. [Quick Start (Run Locally)](#quick-start-run-locally)
3. [Project Structure](#project-structure)
4. [How the App Works — Flow Overview](#how-the-app-works--flow-overview)
5. [Plugging In Your Excel Data](#plugging-in-your-excel-data)
6. [The Three Outcome Screens](#the-three-outcome-screens)
7. [Key Concepts Glossary](#key-concepts-glossary)
8. [Further Reading](#further-reading)

---

## What This App Does

Instead of presenting a user with a wall of form fields, this app simulates a one-on-one conversation with a friendly virtual broker named **Alex**. Questions appear one at a time, answers animate in as chat bubbles, and conditional logic invisibly routes the user through only the questions that are relevant to them.

At the end of the conversation, the app feeds all collected answers into two engines:

| Engine | File | Output |
|---|---|---|
| **Underwriting Engine** | `src/engine/underwritingEngine.ts` | Accept / Decline / Refer |
| **Quote Calculator** | `src/engine/quoteCalculator.ts` | Annual & monthly premium |

All questions, branching rules, rating factors, and underwriting thresholds live in two data files that are designed to be replaced with your converted Excel data — **no other code needs to change**.

---

## Quick Start (Run Locally)

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Steps

```bash
# 1. Navigate into the project folder
cd FormBuilder

# 2. Install dependencies (only needed once)
npm install

# 3. Start the development server
npm run dev
```

Open your browser at **http://localhost:3000**.

To create a production build:

```bash
npm run build
npm start
```

---

## Project Structure

```
FormBuilder/
│
├── src/
│   ├── app/
│   │   ├── page.tsx          ← Root page — renders the four phases
│   │   ├── layout.tsx        ← HTML shell, metadata, font
│   │   └── globals.css       ← Tailwind base + custom animations
│   │
│   ├── types/
│   │   └── index.ts          ← All TypeScript interfaces (Question, Answer, QuoteDetails…)
│   │
│   ├── data/                 ← ★ THE PLUGGABLE LAYER — edit these two files
│   │   ├── questions.ts      ← Every question, option, branch, and UW rule
│   │   └── ratingFactors.ts  ← All multipliers and flat adjustments
│   │
│   ├── engine/
│   │   ├── underwritingEngine.ts  ← Evaluates answers → Accept/Decline/Refer
│   │   └── quoteCalculator.ts     ← Calculates the final premium
│   │
│   ├── context/
│   │   └── QuoteContext.tsx  ← Global state: answers, phase, routing, history
│   │
│   ├── utils/
│   │   └── interpolate.ts    ← Replaces {{placeholders}} in broker text
│   │
│   └── components/
│       ├── IntroScreen.tsx        ← Welcome / landing screen
│       ├── ConversationView.tsx   ← Chat orchestrator (typing → message → input)
│       ├── ChatBubble.tsx         ← Broker (white) and user (indigo) bubbles
│       ├── TypingIndicator.tsx    ← Animated 3-dot pulse
│       ├── ProgressBar.tsx        ← Slim progress bar at the top
│       ├── InputRenderer.tsx      ← Picks the right input component for question.type
│       ├── SummaryScreen.tsx      ← "Let's review your details" card list
│       ├── QuoteResult.tsx        ← Accept / Decline / Refer result screens
│       │
│       └── inputs/
│           ├── ChoiceInput.tsx    ← Button grid (≤ 6 options)
│           ├── ToggleInput.tsx    ← Two-option Yes / No buttons
│           ├── TextInput.tsx      ← Free-text field + submit arrow
│           ├── NumberInput.tsx    ← Numeric input with min/max validation
│           ├── CurrencyInput.tsx  ← Dollar input ($) with auto-formatting
│           ├── DropdownInput.tsx  ← Searchable select (for long option lists)
│           └── DateInput.tsx      ← Native date picker
│
├── docs/
│   ├── ARCHITECTURE.md       ← Deep-dive: components, state, data flow
│   ├── DATA_GUIDE.md         ← How to convert your Excel file to JSON
│   └── UNDERWRITING_ENGINE.md ← How Accept/Decline/Refer and pricing work
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## How the App Works — Flow Overview

The app moves through four sequential **phases**, controlled by `QuoteContext`:

```
[ intro ] ──► [ conversation ] ──► [ summary ] ──► [ result ]
```

### Phase 1 — Intro
A branded welcome screen. The user clicks **"Get my free quote →"** to begin.

### Phase 2 — Conversation
The core chat loop, managed by `ConversationView`:

```
1. Current question changes
2. Typing indicator appears (1.1 s)
3. Broker message fades in (interpolated with prior answers)
4. Input widget slides up — user answers
5. User's reply appears as a right-aligned blue bubble
6. Routing logic picks the next question → repeat from step 1
```

Conditional branching and underwriting checks happen silently in `QuoteContext` every time an answer is submitted.

### Phase 3 — Summary
A scannable card list showing every question and its captured answer. The user can confirm or restart.

### Phase 4 — Result
`calculateQuote()` is called once and the result is displayed as one of:
- **Accept** — premium breakdown with monthly / annual price
- **Decline** — polite rejection with reason(s)
- **Refer** — "a specialist will call you" with next-steps list

---

## Plugging In Your Excel Data

You only need to edit **two files**:

| File | What to change |
|---|---|
| `src/data/questions.ts` | Replace the `QUESTIONS` array with your converted questions |
| `src/data/ratingFactors.ts` | Replace the multiplier tables with your actuarial factors |

See **[docs/DATA_GUIDE.md](docs/DATA_GUIDE.md)** for the complete column-by-column Excel mapping guide and a worked example.

---

## The Three Outcome Screens

| Decision | Trigger condition | Screen shown |
|---|---|---|
| **Accept** | No decline or refer rules triggered | Premium breakdown with "Buy" button |
| **Decline** | Any `decision: "decline"` UW rule fires | Polite rejection with reason list |
| **Refer** | Any `decision: "refer"` UW rule fires (and no declines) | "Specialist will call" screen with next steps |

Decline always takes precedence over Refer.

---

## Key Concepts Glossary

| Term | Meaning |
|---|---|
| **Question** | One chat turn — a broker message + an input widget |
| **Answer** | A captured user response `{ value, displayValue }` |
| **Conditional Branch** | A routing rule: "if answer to X equals Y, go to question Z" |
| **Underwriting Rule** | A trigger: "if answer to X equals Y, decline/refer with this message" |
| **Rating Factor** | A named multiplier applied to the base premium in the quote calculator |
| **Phase** | The app's current screen: `intro`, `conversation`, `summary`, or `result` |
| **Interpolation** | Inserting a previous answer into broker text: `{{applicant_name}}` → `"Sarah"` |

---

## Further Reading

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Component tree, state flow, animation system
- [DATA_GUIDE.md](docs/DATA_GUIDE.md) — Excel → JSON mapping, question types, worked examples
- [UNDERWRITING_ENGINE.md](docs/UNDERWRITING_ENGINE.md) — Pricing formula, rule evaluation, extending the engine
