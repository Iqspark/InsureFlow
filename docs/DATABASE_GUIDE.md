# Database Guide

This document explains how the authentication system works, how quotes and policies are stored, how multiple insurance products share one table, how drafts work, how to query the data, and the commands you'll use day to day.

The app uses **PostgreSQL (Neon)** via **Prisma 5**. There is no SQLite — both local development and production point `DATABASE_URL` at a Postgres connection string.

---

## Table of Contents

1. [Overview](#overview)
2. [Local Setup](#local-setup)
3. [Database Schema](#database-schema)
   - [Broker Model](#broker-model)
   - [Submission Model](#submission-model)
   - [Typed Columns vs `allAnswers` (Multiple Products)](#typed-columns-vs-allanswers-multiple-products)
   - [Draft vs Complete](#draft-vs-complete)
   - [Quote vs Bound Policy (`purchased`)](#quote-vs-bound-policy-purchased)
   - [Indexes](#indexes)
4. [Broker Isolation](#broker-isolation)
5. [Seeding the Database](#seeding-the-database)
6. [API Endpoints](#api-endpoints)
7. [Delete Protection for Bound Policies](#delete-protection-for-bound-policies)
8. [Viewing Data with Prisma Studio](#viewing-data-with-prisma-studio)
9. [Common Commands](#common-commands)
10. [Schema Changes — Adding a Column](#schema-changes--adding-a-column)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The database has two models:

- **Broker** — authenticated users (insurance brokers). Created via the seed script.
- **Submission** — one row per quote. A submission progresses through states: it may start as a **draft**, become a **complete** quote with an underwriting decision, and finally be marked as a **bound policy** when the broker buys it.

When a broker clicks **"Confirm & Get Quote"** on the Summary screen, the app:

1. Calculates the quote and shows the result immediately (not blocked by the save)
2. Calls `POST /api/submissions` in the background
3. The route saves all answers + the underwriting result, tagged with the broker's ID

The save is **non-blocking** — if it fails, the broker still sees their quote. Errors are logged to the server console.

```
Broker clicks "Confirm & Get Quote"
  │
  ├─ (sync) calculateQuote(answers) → show result screen
  │
  └─ (async, non-blocking)
       fetch("POST /api/submissions", { answers, quoteDetails, draftId?, policyType? })
         └─ prisma.submission.create / update({ brokerId, status: "complete", ... })
              └─ PostgreSQL (Neon)
```

---

## Local Setup

There is no zero-config SQLite file. You need a Postgres connection string (a free [Neon](https://neon.tech) project works well) in `.env` at the project root:

```
DATABASE_URL="postgresql://<user>:<YOUR_DB_PASSWORD>@<your-host>/<db_name>?sslmode=require"
NEXTAUTH_SECRET="<random-32+-char-string>"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

Then create the tables and the demo brokers:

```bash
npx prisma db push     # Create tables from schema (no migration history)
npx prisma generate    # Generate the Prisma client
npm run db:seed         # Create the demo broker accounts
```

> `prisma db push` is the dev-friendly path (no migration files). For tracked migrations use `npx prisma migrate dev --name <description>` instead.

---

## Database Schema

The schema lives in `prisma/schema.prisma`. Datasource provider is `postgresql`.

### Broker Model

Each row is a broker (an authenticated user of the portal).

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique broker ID |
| `createdAt` | DateTime | Account creation time |
| `updatedAt` | DateTime | Last modification |
| `name` | String | Broker's display name |
| `email` | String (unique) | Login email |
| `password` | String | bcrypt hash |
| `licenseId` | String? | Optional broker license number |

`Broker` has a one-to-many relation to `Submission` (`submissions`). Indexed on `email`.

### Submission Model

Each row is one quote. It holds the broker who created it, contact + property + coverage fields (typed columns used by the Vacant Home product), the full raw answer set as JSON, and the underwriting result.

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique submission ID — auto-generated |
| `createdAt` | DateTime | When the row was created |
| `updatedAt` | DateTime | Last modification timestamp |
| **Ownership / product** | | |
| `brokerId` | String? | Foreign key → `Broker.id` |
| `policyType` | String | Product name. Default `"Vacant Home Insurance"` |
| **Contact** | | |
| `applicantName` | String? | Answer to applicant name |
| `contactEmail` | String? | Applicant email |
| `contactPhone` | String? | Applicant phone |
| `sessionId` | String? | Browser session ID |
| **Property location** | | |
| `province` | String? | Province/territory code (e.g. "ON", "BC") |
| `propertyAddress` | String? | Full street address (from Google Places autocomplete) |
| `propertyType` | String? | e.g. "single_family", "condo" |
| **Property details** | | |
| `yearBuilt` | Int? | e.g. 1985 |
| `squareFootage` | Int? | e.g. 1800 |
| `propertyValue` | Float? | Replacement cost in CAD |
| **Coverage** | | |
| `coveragePercent` | String? | "100", "90", or "80" |
| `deductible` | Float? | e.g. 2500.0 |
| **Vacancy** | | |
| `vacancyDuration` | String? | e.g. "0-6m", "6-12m", "1-3y" |
| `vacancyReason` | String? | e.g. "for_sale", "estate", "renovation" |
| **Management** | | |
| `inspectionFrequency` | String? | e.g. "weekly", "monthly", "rarely" |
| `utilitiesWinterized` | String? | "yes" or "no" |
| `securityFeatures` | String? | e.g. "alarm_locks", "none" |
| **Features** | | |
| `hasPool` | String? | "yes" or "no" |
| `poolFenced` | String? | "yes" or "no" (only set if hasPool = "yes") |
| **Loss history** | | |
| `priorDamage` | String? | "yes" or "no" |
| `damageType` | String? | e.g. "cosmetic", "fire", "water" |
| `priorClaims` | String? | "0", "1", "2", "3+" |
| `priorInsurance` | String? | "yes" or "no" |
| **State** | | |
| `status` | String | `"draft"` or `"complete"`. Default `"complete"` |
| `purchased` | Boolean | `false` = quote only · `true` = bound policy. Default `false` |
| **Raw answers** | | |
| `allAnswers` | String | Full JSON blob of all answers. Default `"{}"` |
| **Underwriting result** | | |
| `decision` | String? | "accept", "decline", or "refer" — null for drafts |
| `annualPremium` | Float? | Calculated annual premium in CAD (null if not accepted) |
| `monthlyPremium` | Float? | Annual ÷ 12 (null if not accepted) |
| `coverageAmount` | Float? | Insured value in CAD (null if not accepted) |
| `declineReasons` | String? | JSON array of decline reason strings |
| `referralReasons` | String? | JSON array of referral reason strings |

### Typed Columns vs `allAnswers` (Multiple Products)

The portal supports more than one insurance product (e.g. Vacant Home Insurance and Jeweller's Block). The named/typed columns above (`province`, `vacancyDuration`, `hasPool`, etc.) are tailored to the **Vacant Home** questionnaire.

- **Vacant Home** answers are mapped one-by-one into the typed columns by `src/app/api/submissions/route.ts` (and `src/app/api/drafts/route.ts`), so they can be filtered and aggregated in SQL.
- **Non-vacant products (e.g. Jeweller's Block)** do not have their own typed columns. Their answers are stored only in the `allAnswers` JSON blob. The product is identified by `policyType`. To read product-specific fields for these products, parse `allAnswers`.

In all cases, `allAnswers` always holds the complete `Record<string, Answer>` — it is the source of truth; typed columns are a denormalized convenience for the Vacant Home product.

### Draft vs Complete

`status` distinguishes incomplete and finished quotes:

- **`draft`** — written by `POST /api/drafts` as the broker works through the questionnaire (upsert by `draftId`). Drafts have no underwriting result (`decision` is null) and only persist contact/property fields plus the `allAnswers` blob. A "Draft" badge is shown on the search page for these rows.
- **`complete`** — written by `POST /api/submissions` when the quote is calculated. If a `draftId` is supplied, the existing draft row is **promoted in place** (`update`) to `status: "complete"` with the full result; otherwise a new complete row is created.

### Quote vs Bound Policy (`purchased`)

`purchased` distinguishes a quote from a bound policy:

- `purchased = false` (default) — a quote.
- `purchased = true` — the broker pressed **"Buy This Policy"**. `POST /api/buy-policy` verifies the quote was accepted, sets `purchased: true`, and sends the confirmation email (and notifies `UNDERWRITER_EMAIL` if set).

### Indexes

`createdAt`, `status`, `decision`, `province`, `contactEmail`, `vacancyDuration`, `propertyType`, `brokerId`.

---

## Broker Isolation

Every submission is tagged with `brokerId` from the authenticated session. Ownership-scoped routes (delete, draft load/delete, buy-policy) verify `submission.brokerId === session.user.id` before acting, returning 404 when it doesn't match. This keeps each broker's data private.

---

## Seeding the Database

The seed script creates demo broker accounts. Run it once after creating the tables:

```bash
npm run db:seed
```

This upserts two brokers (running it again is safe):

```
John Clarke     <broker@demo.com>                  Demo1234!   BRK-001
Harpreet Singh  <harpreet.singh@insureflow.com>    Demo1234!   BRK-002
```

Passwords are bcrypt-hashed. **Seed file:** `prisma/seed.js`.

Authentication uses NextAuth v4 Credentials provider (`src/lib/auth.ts`): the email is looked up, the password is verified with `bcrypt.compare`, and a JWT session (8-hour max age) is issued.

---

## API Endpoints

All submission/draft/policy endpoints require an authenticated session. Unauthenticated requests return HTTP 401.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/submissions` | POST | Save a completed quote (or promote a draft). Body: `{ answers, quoteDetails, sessionId?, draftId?, policyType? }`. Returns `{ success, id }` (201). |
| `/api/submissions` | GET | Paginated list. Query: `page`, `limit` (max 100), `decision`, `province`, `email` (partial match). Returns `{ data, meta }`. |
| `/api/submissions/[id]` | DELETE | Delete a quote owned by the broker. Bound policies are protected (see below). |
| `/api/drafts` | POST | Upsert a draft (`status: "draft"`). Pass `draftId` to update, omit to create. Returns `{ id }`. |
| `/api/drafts/[id]` | GET | Load a draft's `allAnswers` (broker-owned, `status: "draft"` only). Returns `{ answers }`. |
| `/api/drafts/[id]` | DELETE | Delete a broker-owned draft. |
| `/api/buy-policy` | POST | Mark an accepted quote as `purchased`, send confirmation email. Body: `{ submissionId }`. Returns `{ success, sentTo, previewUrl }` (`previewUrl` only in Ethereal dev mode). |
| `/api/analytics` | GET | Pre-aggregated analytics across the broker's submissions. |

---

## Delete Protection for Bound Policies

`DELETE /api/submissions/[id]` (`src/app/api/submissions/[id]/route.ts`):

1. Requires a session (401 otherwise).
2. Loads the submission's `brokerId` and `purchased`. If it doesn't exist or belongs to another broker → **404**.
3. If `purchased` is `true` → **409 Conflict** with `{ error: "Bound policies cannot be deleted." }`.
4. Otherwise the row is deleted.

Drafts are deleted separately via `DELETE /api/drafts/[id]`, scoped to the owning broker and `status: "draft"`.

---

## Viewing Data with Prisma Studio

```bash
npx prisma studio
```

Opens a browser at `http://localhost:5555` to view, filter, edit, and export Broker and Submission records.

---

## Common Commands

```bash
npx prisma db push     # Apply schema to the database (dev, no migration history)
npx prisma generate    # Regenerate the Prisma client after schema changes
npm run db:seed         # Seed demo brokers (prisma/seed.js)
npx prisma studio      # Visual DB browser at http://localhost:5555
npx prisma migrate dev --name <description>   # Create + apply a tracked migration
```

---

## Schema Changes — Adding a Column

To store a new answer in a dedicated column:

1. Add the field to `model Submission` in `prisma/schema.prisma`:

```prisma
model Submission {
  // ... existing fields ...
  heatingType  String?
}
```

2. Apply it and regenerate the client:

```bash
npx prisma db push        # or: npx prisma migrate dev --name add_heating_type
npx prisma generate
```

3. Map the answer in `src/app/api/submissions/route.ts` (and `src/app/api/drafts/route.ts` if it should persist in drafts):

```typescript
heatingType: getString("heating_type") || null,
```

For products other than Vacant Home, prefer reading from `allAnswers` rather than adding typed columns.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `PrismaClientInitializationError` | Run `npx prisma generate`, then restart `npm run dev`. Confirm `DATABASE_URL` is reachable. |
| `DATABASE_URL` not found | Make sure `.env` exists at the project root with a valid Postgres connection string. |
| Tables missing | Run `npx prisma db push` then `npm run db:seed`. |
| SSL error connecting to Postgres | Append `?sslmode=require` to `DATABASE_URL`. |
| API returns 401 | Session expired — log in again at `/login`. |
| API returns 500 | Check the `npm run dev` terminal for the full error. |
| Login fails with correct credentials | Run `npm run db:seed` — the demo accounts may not exist yet. |
| Prisma Client out of sync | Run `npx prisma generate` after any schema change. |
