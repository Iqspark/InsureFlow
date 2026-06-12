# InsureFlow — Broker Portal

A chat-style insurance quoting portal for brokers, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **NextAuth**, and **Prisma + PostgreSQL**.

Brokers log in, walk an applicant through a conversational questionnaire with a virtual broker named **Alex**, and get an instant **Accept / Decline / Refer** decision with a premium breakdown. Accepted quotes can be **saved as a quote** or **bound as a policy** (which emails a confirmation to the applicant and notifies the underwriting team). It installs on a phone as a **PWA**.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start (Run Locally)](#quick-start-run-locally)
4. [Environment Variables](#environment-variables)
5. [Insurance Packages](#insurance-packages)
6. [Quote vs. Policy](#quote-vs-policy)
7. [Install as a Mobile App (PWA)](#install-as-a-mobile-app-pwa)
8. [Deploying to Azure](#deploying-to-azure)
9. [Project Structure](#project-structure)
10. [How a Quote Is Decided & Priced](#how-a-quote-is-decided--priced)
11. [Adding a New Package](#adding-a-new-package)
12. [Further Reading](#further-reading)

---

## Features

- **Conversational quoting** — one question at a time, chat bubbles, typing indicators, conditional branching, and a "change a previous answer" assistant.
- **Two insurance packages** — Vacant Home Insurance and Jeweller's Block, each with their own questions, rating factors, and underwriting rules (a product registry makes adding more easy).
- **Underwriting decision** — every quote resolves to **Accept**, **Decline**, or **Refer to underwriter**, with the reasons recorded.
- **Quote ↔ Policy states** — a calculated quote is saved automatically; pressing **Buy This Policy** binds it as a **Policy** (the dashboard and search show which is which).
- **Property address + map** — Vacant Home quotes capture the address with Google Places autocomplete and show the location on a map (portal + PDF).
- **Downloadable PDF** — a branded one-click PDF of any quote/policy, including the location map and a Quote/Policy stamp.
- **Email** — applicant confirmation on bind + an underwriter/back-office notification.
- **Broker portal** — login, dashboard, full-text-ish search, draft auto-save & resume, per-broker data isolation.
- **Installable PWA** — add it to a phone home screen and run it full-screen.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript 5 |
| Styling | Tailwind CSS, Framer Motion |
| Auth | NextAuth v4 (credentials) |
| Database | Prisma 5 + PostgreSQL (Neon) |
| PDF | `@react-pdf/renderer` (pure Node) |
| Maps | Google Maps (Places + Embed + Static) |
| AI | OpenAI `gpt-4o-mini` (Help Navigator, change-answer) |
| Email | Nodemailer (Ethereal fallback in dev) |
| PWA | `@ducanh2912/next-pwa` |

---

## Quick Start (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ and npm
- A PostgreSQL database URL (e.g. a free [Neon](https://neon.tech) project)

### Steps

```bash
# 1. Install dependencies (once)
npm install

# 2. Create your .env (see "Environment Variables" below)
cp .env.example .env   # then fill in the values

# 3. Apply the database schema and create the demo broker
npx prisma db push
node prisma/seed.js

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

**Demo login:** `broker@demo.com` / `Demo1234!`

Production build:

```bash
npm run build
npm start
```

> **Note:** the PWA/service worker is intentionally **disabled in `npm run dev`** (it interferes with hot-reload). To test install-as-an-app behaviour, always use `npm run build && npm start`.

---

## Environment Variables

Set these in `.env` (see `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"        # must match the URL you load

OPENAI_API_KEY="sk-..."                      # Help Navigator + change-answer

# Email — leave SMTP_PASS blank to use the Ethereal test inbox (preview URL in console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=                                    # Gmail App Password for real delivery
SMTP_FROM="InsureFlow <you@gmail.com>"
UNDERWRITER_EMAIL=underwriting@yourco.com     # notified when a policy is bound

# Google Maps — address autocomplete + maps. Enable: Maps JavaScript, Places, Maps Embed, Maps Static.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

> `NEXT_PUBLIC_*` values are baked in at **build time** — rebuild after changing them.

---

## Insurance Packages

Selected from **New Quote**:

- **Vacant Home Insurance** (Personal → Vacant Homes)
- **Jeweller's Block** (Commercial → Jeweller Block) — covers a jeweller's stock against theft/burglary/robbery; rated on sum insured, safe/alarm grade, % of stock in the safe overnight, window exposure, transit, and loss history.

Each package lives in the product registry (`src/data/products.ts`) and supplies its own questions, rating factors, and calculator. The chat engine, persistence, PDF, and result screens are shared.

---

## Quote vs. Policy

Two independent dimensions are tracked per submission:

| Dimension | Values | Meaning |
|---|---|---|
| **Decision** | Accept · Decline · Refer | The underwriting outcome |
| **Stage** | Quote · Policy | A quote, or a bound policy (Buy pressed) |

On the result screen an accepted quote offers **Save as Quote** or **Buy This Policy**. Binding a policy emails the applicant, notifies the underwriter, and flips the badge to **Policy** across the dashboard, search, detail page, and PDF.

---

## Install as a Mobile App (PWA)

The app is a Progressive Web App, so it installs to a phone home screen and runs full-screen with its own icon — no app store needed.

**Two requirements:** it must be a **production build** (`npm start`, not `npm run dev`) and served over **HTTPS** (browsers only allow install over HTTPS, except on `localhost`).

Pick the path that fits:

### Option A — Quick look on the same Wi-Fi (no install)
1. `npm run build && npm start` on your computer.
2. Find your computer's local IP (Windows: `ipconfig` → IPv4 Address, e.g. `192.168.1.42`).
3. On your phone (same Wi-Fi) open `http://192.168.1.42:3005`.

You can use it in the browser, but because it's plain `http`, Android won't show the full **Install** prompt and offline won't work. Good for a quick preview.

### Option B — Full PWA via an HTTPS tunnel (best for testing on a real phone)
1. `npm run build && npm start`.
2. Expose it over HTTPS with a tunnel, e.g.:
   ```bash
   npx cloudflared tunnel --url http://localhost:3005
   # or: ngrok http 3005
   ```
   You'll get a public `https://…` URL.
3. **Important:** set `NEXTAUTH_URL` to that exact HTTPS URL in `.env`, then rebuild & restart (otherwise login redirects break). If your Google Maps key is referrer-restricted, add the tunnel domain too.
4. Open the HTTPS URL on your phone and install (see steps below).

### Option C — Deploy and install from the live URL (best for a real demo)
Deploy to Azure (see below) and install from your `https://<app>.azurewebsites.net` URL. This is the most reliable and shareable option.

### Installing once it's on HTTPS
- **iPhone (Safari):** open the URL → tap **Share** → **Add to Home Screen**.
- **Android (Chrome):** open the URL → menu **⋮** → **Install app** (or **Add to Home Screen**).

The installed app shows the **IF** icon, launches full-screen, and uses the cached service worker.

---

## Deploying to Azure

A GitHub Actions pipeline (`.github/workflows/azure-deploy.yml`) builds the Next.js standalone output, applies the DB schema, and deploys to Azure App Service.

Before the live app works you must:
1. Add the GitHub **secrets** the workflow needs (`AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`, and optionally `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `SMTP_*`, `UNDERWRITER_EMAIL`).
2. Set the **runtime** Application Settings (same keys) in Azure App Service → Configuration.
3. Use a strong `NEXTAUTH_SECRET` and set `NEXTAUTH_URL` to the deployed URL.

See `docs/DEPLOYMENT_GUIDE.md` for the full walkthrough.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/              ← Login (no header/footer)
│   ├── (protected)/               ← Auth-guarded: header + footer + help widget
│   │   ├── dashboard/             ← Recent policies + stats
│   │   ├── search/                ← Search quotes/policies
│   │   ├── new-quote/             ← Package picker
│   │   │   ├── vacant-home/       ← Vacant Home quote flow
│   │   │   └── jeweller-block/    ← Jeweller's Block quote flow
│   │   ├── policy/[id]/           ← Saved quote/policy detail (map, PDF, buy)
│   │   ├── privacy / terms / support
│   │   ├── icon / apple-icon / pwa-icon / manifest   ← PWA assets (dynamic)
│   └── api/                       ← submissions, drafts, buy-policy, search,
│                                     policy/[id]/document (PDF), chat-intent, help-chat
├── data/
│   ├── products.ts                ← Product registry
│   ├── questions.ts               ← Vacant Home questions + UW rules
│   ├── jewellerQuestions.ts       ← Jeweller's Block questions + UW rules
│   ├── ratingFactors.ts           ← Vacant Home pricing factors
│   └── jewellerRatingFactors.ts   ← Jeweller's Block pricing factors
├── engine/
│   ├── underwritingEngine.ts      ← Answers → Accept/Decline/Refer
│   ├── quoteCalculator.ts         ← Vacant Home premium
│   └── jewellerQuoteCalculator.ts ← Jeweller's Block premium
├── context/QuoteContext.tsx       ← Conversation state (product-aware)
├── lib/
│   ├── policyPdf.tsx              ← PDF document (react-pdf)
│   ├── submissionSections.ts     ← Detail/PDF section builder
│   ├── email.ts                  ← Confirmation + underwriter emails
│   ├── auth.ts / prisma.ts
├── components/                    ← Chat UI, inputs, result screens, badges, map, buttons
└── utils/                         ← validation, interpolation, googleMaps loader

prisma/schema.prisma               ← Submission + Broker models
```

---

## How a Quote Is Decided & Priced

When the applicant confirms the summary, all answers are fed to two steps:

1. **Underwriting engine** evaluates each question's `underwritingRules` → **Accept / Decline / Refer** (Decline beats Refer).
2. **Quote calculator** multiplies a base premium by the relevant rating factors and adds flat loadings → annual & monthly premium and the coverage/sum-insured.

All thresholds, factors, and rules live in the `src/data/*` files — no engine code changes needed to retune.

---

## Adding a New Package

1. Create `xxxQuestions.ts`, `xxxRatingFactors.ts`, and `xxxQuoteCalculator.ts` under `src/data` / `src/engine`.
2. Register it in `src/data/products.ts` (slug, policy label, questions, calculator, intro).
3. Add a route `src/app/(protected)/new-quote/<slug>/page.tsx` rendering `<QuoteExperience productId="<slug>" />`.
4. Link it from the package picker (`src/app/(protected)/new-quote/page.tsx`).

The shared engine handles the chat, persistence, decision, PDF, and result screens automatically.

---

## Further Reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, state, data flow
- [docs/DATA_GUIDE.md](docs/DATA_GUIDE.md) — question schema & Excel mapping
- [docs/UNDERWRITING_ENGINE.md](docs/UNDERWRITING_ENGINE.md) — decision & pricing logic
- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Azure deployment
