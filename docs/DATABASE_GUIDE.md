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
| `role` | String | `"ADMIN"`, `"BROKER"`, or `"UNDERWRITER"`. Default `"BROKER"` |
| `active` | Boolean | `false` blocks login. Default `true` |

`Broker` has a one-to-many relation to `Submission` (`submissions`) and to the submissions it has reviewed (`reviewedSubmissions`, relation `"ReviewedBy"`). Indexed on `email`. Despite the model name, a `Broker` row represents any user — admin, broker, or underwriter — distinguished by `role`.

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
| **Payment** (simulated, after binding) | | |
| `paymentStatus` | String | `"unpaid"` or `"paid"`. Default `"unpaid"` |
| `paidAt` | DateTime? | When payment completed |
| `paidAmount` | Float? | Amount paid (CAD) |
| `paymentToken` | String? (unique) | Tokenised id emailed to the applicant as the `/pay/<token>` link |
| **Policy term** (set on bind) | | |
| `effectiveAt` | DateTime? | Start of the 12-month policy term, stamped on bind by `POST /api/buy-policy` |
| `expiresAt` | DateTime? | End of the 12-month term (`effectiveAt` + 1 year); renewals derive from this |
| **Underwriter review audit** | | |
| `reviewedById` | String? | FK → `Broker.id` of the reviewer |
| `reviewedAt` | DateTime? | When the referral was decided |
| `reviewNote` | String? | Underwriter note (shared with broker on approval) |
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

The portal supports **ten** insurance products (Vacant Home, Jeweller's Block, Farm, Cyber Liability, Contractor, Architects & Engineers, Retailers, Rental Home, Personal Items, and Lithium Batteries). The named/typed columns above (`province`, `vacancyDuration`, `hasPool`, etc.) are tailored to the **Vacant Home** questionnaire.

- **Vacant Home** answers are mapped one-by-one into the typed columns by `src/app/api/submissions/route.ts` (and `src/app/api/drafts/route.ts`), so they can be filtered and aggregated in SQL.
- **Non-vacant products (e.g. Jeweller's Block, Farm Insurance)** do not have their own typed columns. Their answers are stored only in the `allAnswers` JSON blob. The product is identified by `policyType`. To read product-specific fields for these products, parse `allAnswers`.

In all cases, `allAnswers` always holds the complete `Record<string, Answer>` — it is the source of truth; typed columns are a denormalized convenience for the Vacant Home product.

### Draft vs Complete

`status` distinguishes incomplete and finished quotes:

- **`draft`** — written by `POST /api/drafts` as the broker works through the questionnaire (upsert by `draftId`). Drafts have no underwriting result (`decision` is null) and only persist contact/property fields plus the `allAnswers` blob. A "Draft" badge is shown on the search page for these rows.
- **`complete`** — written by `POST /api/submissions` when the quote is calculated. If a `draftId` is supplied, the existing draft row is **promoted in place** (`update`) to `status: "complete"` with the full result; otherwise a new complete row is created.

### Quote vs Bound Policy (`purchased`) & Payment

- `purchased = false` (default) — a quote.
- `purchased = true` — the broker pressed **"Buy This Policy"**. `POST /api/buy-policy` checks the quote is accepted and not already paid, sets `purchased: true`, generates a `paymentToken`, and emails the **applicant** a `/pay/<token>` payment link (and notifies `UNDERWRITER_EMAIL` on first bind). It no longer sends the applicant confirmation directly.
- `paymentStatus = "paid"` — the applicant completed the simulated checkout at the public `/pay/<token>` page. `POST /api/pay/[token]` validates the card format (no real charge), sets `paymentStatus/paidAt/paidAmount`, and emails the confirmation + receipt.

### Underwriter Review (`decision = "refer"`)

Referred quotes are decided by an admin/underwriter via `POST /api/submissions/[id]/review` (`approve` → `decision: "accept"`, `decline` → `decision: "decline"`), which stamps `reviewedById`, `reviewedAt`, `reviewNote` and emails the broker on approval.

### Indexes

`createdAt`, `status`, `decision`, `province`, `contactEmail`, `vacancyDuration`, `propertyType`, `brokerId`, `reviewedById`, `expiresAt` (added to drive the Upcoming Renewals view). `paymentToken` is unique.

---

## Role-Based Access

Each submission is tagged with `brokerId` from the session. Access is enforced through `src/lib/access.ts`:

- **Brokers** are scoped to their own rows (`brokerId === session.user.id`) on every list/detail/search/PDF/buy query.
- **Admins** and **underwriters** can read all brokers' submissions; underwriters review referrals, admins manage users.
- `DELETE /api/submissions/[id]` allows the owning broker or an admin, and refuses to delete a `purchased` (bound) policy with **409**.

---

## Seeding the Database

The seed script creates demo accounts (one per role). Run it once after creating the tables:

```bash
npm run db:seed
```

This upserts four users (running it again is safe; all use password `Demo1234!`):

```
Alex Morgan     <admin@demo.com>                   ADMIN         ADM-001
Sarah Bennett   <underwriter@demo.com>             UNDERWRITER   UW-001
John Clarke     <broker@demo.com>                  BROKER        BRK-001
Harpreet Singh  <harpreet.singh@insureflow.com>    BROKER        BRK-002
```

Passwords are bcrypt-hashed. **Seed file:** `prisma/seed.js`.

Authentication uses NextAuth v4 Credentials provider (`src/lib/auth.ts`): the email is looked up, the password is verified with `bcrypt.compare`, and a JWT session (8-hour max age) is issued.

---

## API Endpoints

All endpoints except the public payment routes require an authenticated session; unauthenticated requests return 401, and wrong-role requests return 403. List/search queries are scoped by role via `submissionScopeWhere` (broker = own; admin/underwriter = all).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/submissions` | POST | Save a completed quote (or promote a draft). Body: `{ answers, quoteDetails, sessionId?, draftId?, policyType? }`. Returns `{ success, id }` (201). |
| `/api/submissions` | GET | Paginated, role-scoped list. Query: `page`, `limit` (max 100), `decision`, `province`, `email`. Returns `{ data, meta }`. |
| `/api/submissions/[id]` | DELETE | Delete a quote owned by the broker (or any non-bound quote for an admin). Bound policies are protected (see below). |
| `/api/submissions/[id]/review` | POST | Underwriter/admin approve or decline a referred quote. Body: `{ action: "approve"\|"decline", note }`. Emails the broker on approval. |
| `/api/drafts` | POST | Upsert a draft (`status: "draft"`). Pass `draftId` to update, omit to create. Returns `{ id }`. |
| `/api/drafts/[id]` | GET | Load a draft's `allAnswers` (broker-owned, `status: "draft"` only). Returns `{ answers }`. |
| `/api/drafts/[id]` | DELETE | Delete a broker-owned draft. |
| `/api/buy-policy` | POST | Bind an accepted quote (`purchased: true`) and email the applicant a `/pay/<token>` link. Body: `{ submissionId }`. Returns `{ success, resent, sentTo, previewUrl }`. Re-call to resend the link. |
| `/api/pay/[token]` | POST | **Public.** Simulated payment for a bound policy. Body: `{ cardNumber, expiry, cvc }` (format-validated, not charged). Marks paid + emails confirmation/receipt. Returns `{ success, paidAmount, previewUrl }`. |
| `/api/admin/users` | GET / POST | **Admin.** List users / create a user (`{ name, email, password, role, licenseId? }`). |
| `/api/admin/users/[id]` | PATCH | **Admin.** Update `role` and/or `active` (guards against removing the last admin / self-deactivation). |
| `/api/analytics` | GET | Pre-aggregated analytics. |

---

## Delete Protection for Bound Policies

`DELETE /api/submissions/[id]` (`src/app/api/submissions/[id]/route.ts`):

1. Requires a session (401 otherwise).
2. Loads the submission's `brokerId` and `purchased`. If it doesn't exist, or it belongs to another broker and the caller is not an admin → **404**.
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
