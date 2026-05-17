# Database Guide

This document explains how the authentication system works, how form submissions are saved, how to query the data, how to run analytics, and how to migrate from the local SQLite database to a production PostgreSQL database.

---

## Table of Contents

1. [Overview](#overview)
2. [Local Setup (SQLite — zero config)](#local-setup-sqlite--zero-config)
3. [Database Schema](#database-schema)
   - [Broker Model](#broker-model)
   - [Submission Model](#submission-model)
4. [Seeding the Database](#seeding-the-database)
5. [API Endpoints](#api-endpoints)
   - [POST /api/submissions](#post-apisubmissions)
   - [GET /api/submissions](#get-apisubmissions)
   - [POST /api/buy-policy](#post-apibuy-policy)
   - [GET /api/analytics](#get-apianalytics)
6. [Viewing Data with Prisma Studio](#viewing-data-with-prisma-studio)
7. [Analytics — What You Can Measure](#analytics--what-you-can-measure)
8. [Exporting Data to Excel](#exporting-data-to-excel)
9. [Migrating to PostgreSQL (Production)](#migrating-to-postgresql-production)
10. [Schema Changes — Adding a Column](#schema-changes--adding-a-column)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The database has two models:
- **Broker** — authenticated users (insurance brokers). Created once via seed script.
- **Submission** — one row per completed quote, linked to the broker who created it.

Every time a broker clicks **"Confirm & Get Quote"** on the Summary screen, the app:

1. Calculates the quote and shows the result immediately (not blocked by the save)
2. Calls `POST /api/submissions` in the background
3. The API route saves all answers + the underwriting result to the database, tagged with the broker's ID

The save is **non-blocking** — if it fails, the broker still sees their quote. Errors are logged to the server console.

```
Broker clicks "Confirm & Get Quote"
  │
  ├─ (sync) calculateQuote(answers) → show result screen
  │
  └─ (async, non-blocking)
       fetch("POST /api/submissions", { answers, quoteDetails })
         └─ prisma.submission.create({ brokerId: session.user.id, ... })
              └─ prisma/dev.db  (or PostgreSQL in production)
```

---

## Local Setup (SQLite — zero config)

Everything is already configured. The database file is at:

```
prisma/dev.db
```

If it doesn't exist yet, run:

```bash
npx prisma db push          # Create tables from schema (no migration history)
npm run db:seed             # Create the demo broker account
```

Or, for a tracked migration:

```bash
npx prisma migrate dev --name init
npm run db:seed
```

> The file `prisma/dev.db` is covered by the `.gitignore` pattern `*.db` — it will not be committed.

### Important: DATABASE_URL path

In `.env`:
```
DATABASE_URL="file:./prisma/dev.db"
```

This path is relative to the **project root**, which is where Next.js resolves it. The Prisma CLI also resolves it correctly from the project root when you pass `--schema` or run from the root directory.

---

## Database Schema

### Broker Model

Each row is a broker (an authenticated user of the portal).

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique broker ID |
| `createdAt` | DateTime | Account creation time |
| `updatedAt` | DateTime | Last modification |
| `name` | String | Broker's display name |
| `email` | String (unique) | Login email |
| `password` | String | bcrypt-hashed password |
| `licenseId` | String? | Optional broker license number |

### Submission Model

Each row is one completed insurance quote, linked to the broker who ran it.

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique submission ID — auto-generated |
| `createdAt` | DateTime | When the quote was submitted |
| `updatedAt` | DateTime | Last modification timestamp |
| **Ownership** | | |
| `brokerId` | String? | Foreign key → `Broker.id` |
| `policyType` | String | Default: `"Vacant Home Insurance"` |
| **Contact** | | |
| `applicantName` | String? | Answer to "What's your name?" |
| `contactEmail` | String? | Answer to "What email should we use?" |
| `sessionId` | String? | Browser session ID |
| **Property** | | |
| `province` | String? | Province/territory code (e.g. "ON", "BC") |
| `propertyType` | String? | e.g. "single_family", "condo" |
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
| **Loss History** | | |
| `priorDamage` | String? | "yes" or "no" |
| `damageType` | String? | e.g. "cosmetic", "fire", "water" |
| `priorClaims` | String? | "0", "1", "2", "3+" |
| `priorInsurance` | String? | "yes" or "no" |
| **Raw Data** | | |
| `allAnswers` | String | Full JSON blob of all answers |
| **Result** | | |
| `decision` | String | "accept", "decline", or "refer" |
| `annualPremium` | Float? | Calculated annual premium in CAD (null if not accepted) |
| `monthlyPremium` | Float? | Annual ÷ 12 (null if not accepted) |
| `coverageAmount` | Float? | Insured value in CAD (null if not accepted) |
| `declineReasons` | String? | JSON array of decline reason strings |
| `referralReasons` | String? | JSON array of referral reason strings |

### Indexes

- `createdAt` — time-series queries
- `decision` — filter by outcome
- `province` — geographic analysis
- `contactEmail` — look up a specific applicant
- `vacancyDuration` — duration analysis
- `propertyType` — property mix analysis
- `brokerId` — broker isolation (all queries filter by this)

---

## Seeding the Database

The seed script creates the demo broker account. Run it once after setting up the database:

```bash
npm run db:seed
```

This creates:
```
Name:      John Clarke
Email:     broker@demo.com
Password:  Demo1234!
LicenseId: BRK-001
```

The seed uses `upsert` — running it multiple times is safe.

**Seed file:** `prisma/seed.js`

---

## API Endpoints

All submission and policy endpoints require an authenticated session. Unauthenticated requests return HTTP 401.

### POST /api/submissions

**Called automatically** by the app after every quote calculation. You do not need to call this manually.

```
POST /api/submissions
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "answers": { ... },       // Record<string, Answer>
  "quoteDetails": { ... },  // QuoteDetails
  "sessionId": "abc123"     // optional browser session ID
}
```

**Response:**
```json
{ "success": true, "id": "clxxxxxxxxxxxxxx" }
```

Broker isolation: the submission is saved with `brokerId` from the active session.

---

### GET /api/submissions

Retrieve the authenticated broker's submissions (paginated). Brokers cannot see each other's data.

```
GET /api/submissions?page=1&limit=20&decision=accept&province=ON
```

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Records per page (max 100) |
| `decision` | string | — | Filter: `"accept"`, `"decline"`, or `"refer"` |
| `province` | string | — | Filter by province code (e.g. `"ON"`) |
| `email` | string | — | Search by email (partial match) |

**Response:**
```json
{
  "data": [
    {
      "id": "clxxxx",
      "createdAt": "2025-01-15T14:32:00Z",
      "applicantName": "Sarah",
      "contactEmail": "sarah@example.com",
      "province": "ON",
      "propertyType": "single_family",
      "propertyValue": 450000,
      "vacancyDuration": "6-12m",
      "decision": "accept",
      "annualPremium": 1043,
      "monthlyPremium": 87,
      "coverageAmount": 450000
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### POST /api/buy-policy

Sends the policy confirmation email for an accepted quote. Called when the broker clicks "Buy This Policy".

```
POST /api/buy-policy
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "submissionId": "clxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "sentTo": "applicant@example.com",
  "previewUrl": "https://ethereal.email/message/..."   // only in dev (Ethereal mode)
}
```

The route verifies the session and confirms the submission belongs to the authenticated broker before sending email.

---

### GET /api/analytics

Returns pre-aggregated analytics across the authenticated broker's submissions.

```
GET /api/analytics
```

**Response shape:**

```json
{
  "overview": {
    "total": 150,
    "byDecision": { "accept": 95, "decline": 30, "refer": 25 },
    "rates": { "accept": 63.3, "decline": 20.0, "refer": 16.7 }
  },
  "premiums": {
    "avg": 1187.50,
    "min": 562.00,
    "max": 4320.00,
    "count": 95
  },
  "byProvince": [
    { "province": "ON", "count": 52, "avgPremium": 1210.00 },
    { "province": "BC", "count": 38, "avgPremium": 1380.00 }
  ],
  "byPropertyType": [
    { "type": "single_family", "count": 88 },
    { "type": "condo", "count": 42 }
  ],
  "byVacancyDuration": [
    { "duration": "0-6m", "count": 65 },
    { "duration": "6-12m", "count": 45 }
  ],
  "topDeclineReasons": [
    { "reason": "Properties vacant for more than 5 years...", "count": 18 }
  ],
  "topReferReasons": [
    { "reason": "Properties with no regular inspections...", "count": 14 }
  ],
  "recentSubmissions": [ ... ],
  "dailyVolume": [
    { "date": "2025-01-14", "count": 12 },
    { "date": "2025-01-15", "count": 19 }
  ]
}
```

---

## Viewing Data with Prisma Studio

Prisma Studio is a free visual database browser built into Prisma:

```bash
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can:
- View all Broker and Submission records
- Filter and sort by any column
- Edit individual records
- Export selected rows to CSV

---

## Analytics — What You Can Measure

### Conversion & Outcomes
- Accept / Decline / Refer rate over time
- How rates change by province
- Which underwriting rules fire most often (top decline reasons)

### Pricing
- Average, min, max annual premium by province
- Premium distribution histogram
- Impact of deductible choice on final premium

### Risk Profile
- Most common property types
- Vacancy duration distribution
- Security measure adoption rates

### Operational
- Daily/weekly submission volume
- Email domains (corporate vs personal)

---

## Exporting Data to Excel

**Option 1 — Prisma Studio CSV**
1. Run `npx prisma studio`
2. Open the `Submission` table
3. Select all rows, click "Export as CSV"

**Option 2 — Direct SQLite query**

Install DB Browser for SQLite (free, open source) and open `prisma/dev.db`. Run any SQL query and export results to CSV.

```sql
-- All accepted quotes with key details
SELECT
  applicantName,
  contactEmail,
  province,
  propertyType,
  propertyValue,
  vacancyDuration,
  annualPremium,
  monthlyPremium,
  coverageAmount,
  deductible,
  createdAt
FROM Submission
WHERE decision = 'accept'
ORDER BY createdAt DESC;

-- Decline rate by province
SELECT
  province,
  COUNT(*) as total,
  SUM(CASE WHEN decision = 'decline' THEN 1 ELSE 0 END) as declines,
  ROUND(100.0 * SUM(CASE WHEN decision = 'decline' THEN 1 ELSE 0 END) / COUNT(*), 1) as decline_rate_pct
FROM Submission
WHERE province IS NOT NULL
GROUP BY province
ORDER BY decline_rate_pct DESC;

-- Average premium by vacancy duration (accepted only)
SELECT
  vacancyDuration,
  COUNT(*) as count,
  ROUND(AVG(annualPremium), 2) as avg_annual_premium
FROM Submission
WHERE decision = 'accept' AND annualPremium IS NOT NULL
GROUP BY vacancyDuration
ORDER BY avg_annual_premium;
```

**Option 3 — API + Excel Power Query**
1. In Excel: Data → Get Data → From Web
2. Enter: `http://localhost:3000/api/submissions?limit=1000`
3. Power Query will parse the JSON and load it into a table
4. Refresh the query to pull the latest data

---

## Migrating to PostgreSQL (Production)

When you're ready to deploy, switch from SQLite to PostgreSQL in three steps.

### Step 1 — Get a PostgreSQL connection string

Choose a provider:
- **Supabase** (free tier available): `https://supabase.com`
- **Neon** (serverless Postgres, generous free tier): `https://neon.tech`
- **Railway**: `https://railway.app`

Copy the `DATABASE_URL` connection string from your provider's dashboard.

### Step 2 — Update `.env`

```bash
# Change this line:
DATABASE_URL="file:./prisma/dev.db"

# To your PostgreSQL connection string:
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### Step 3 — Update `prisma/schema.prisma`

Change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"   # ← was "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 4 — Deploy the schema

```bash
npx prisma migrate deploy
```

This applies all existing migrations to your new PostgreSQL database.

> **Tip:** To migrate existing SQLite data to PostgreSQL, use [pgloader](https://pgloader.io/) or export to CSV and re-import.

---

## Schema Changes — Adding a Column

If you add a new question to `questions.ts` and want to store its answer in a dedicated column:

1. Add the column to `prisma/schema.prisma`:

```prisma
model Submission {
  // ... existing fields ...
  heatingType  String?   // new field
}
```

2. Create and apply the migration:

```bash
npx prisma migrate dev --name add_heating_type
```

3. Regenerate the Prisma client:

```bash
npx prisma generate
```

4. Extract and save the value in `src/app/api/submissions/route.ts`:

```typescript
heatingType: getString("heating_type") || null,
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `PrismaClientInitializationError` | Run `npx prisma generate` then restart `npm run dev` |
| `DATABASE_URL` not found | Make sure `.env` exists in the project root with `DATABASE_URL="file:./prisma/dev.db"` |
| `dev.db` not found | Run `npx prisma db push` then `npm run db:seed` |
| Migration fails | Check that the `prisma/` directory is writable and `dev.db` isn't locked |
| API returns 401 | Session cookie expired — log out and log back in at `/login` |
| API returns 500 | Check the terminal running `npm run dev` for the full error message |
| Data not saving in prod | Ensure `DATABASE_URL` is set as an environment variable on the server |
| Prisma Client out of sync | Run `npx prisma generate` after any schema change |
| Login fails with correct credentials | Run `npm run db:seed` — the demo account may not exist yet |
