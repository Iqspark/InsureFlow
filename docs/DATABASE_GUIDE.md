# Database Guide

This document explains how form submissions are saved, how to query the data, how to run analytics, and how to migrate from the local SQLite database to a production PostgreSQL database.

---

## Table of Contents

1. [Overview](#overview)
2. [Local Setup (SQLite — zero config)](#local-setup-sqlite--zero-config)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
   - [POST /api/submissions](#post-apisubmissions)
   - [GET /api/submissions](#get-apisubmissions)
   - [GET /api/analytics](#get-apianalytics)
5. [Viewing Data with Prisma Studio](#viewing-data-with-prisma-studio)
6. [Analytics — What You Can Measure](#analytics--what-you-can-measure)
7. [Exporting Data to Excel](#exporting-data-to-excel)
8. [Migrating to PostgreSQL (Production)](#migrating-to-postgresql-production)
9. [Schema Changes — Adding a Column](#schema-changes--adding-a-column)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Every time a user clicks **"Calculate My Quote"** on the Summary screen, the app:

1. Calculates the quote and shows the result (immediate — not blocked by the save)
2. Calls `POST /api/submissions` in the background
3. The API route saves all answers + the underwriting result to the database

The save is **non-blocking** — if it fails, the user still sees their quote. Errors are logged to the server console.

```
User clicks "Calculate My Quote"
  │
  ├─ (sync) calculateQuote(answers) → show result screen
  │
  └─ (async, non-blocking)
       fetch("POST /api/submissions", { answers, quoteDetails, sessionId })
         └─ prisma.submission.create(...)
              └─ submissions.db  (or PostgreSQL in production)
```

---

## Local Setup (SQLite — zero config)

Everything is already configured. When you ran `npm install` and `npx prisma migrate dev`, it:

1. Created `prisma/submissions.db` — a SQLite database file on your machine
2. Created the `Submission` table with all columns and indexes
3. Generated the Prisma Client (the TypeScript ORM wrapper)

**Your database file:** `prisma/submissions.db`

> Add `prisma/submissions.db` to your `.gitignore` if you want to avoid committing test data.
> It's already covered by the existing `.gitignore` pattern `*.db`.

---

## Database Schema

Each form submission creates one row in the `Submission` table.

### Full Column Reference

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique submission ID — auto-generated |
| `createdAt` | DateTime | When the quote was submitted |
| `updatedAt` | DateTime | Last modification timestamp |
| **Contact** | | |
| `applicantName` | String? | Answer to "What's your name?" |
| `contactEmail` | String? | Answer to "What email should we send this to?" |
| `sessionId` | String? | Browser session ID (correlates multiple runs) |
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
| `allAnswers` | String | Full JSON blob of all answers — for flexibility |
| **Result** | | |
| `decision` | String | "accept", "decline", or "refer" |
| `annualPremium` | Float? | Calculated annual premium in CAD (null if not accepted) |
| `monthlyPremium` | Float? | Annual ÷ 12 (null if not accepted) |
| `coverageAmount` | Float? | Insured value in CAD (null if not accepted) |
| `declineReasons` | String? | JSON array of decline reason strings |
| `referralReasons` | String? | JSON array of referral reason strings |

### Indexes

The following columns are indexed for fast analytics queries:

- `createdAt` — time-series queries
- `decision` — filter by outcome
- `province` — geographic analysis
- `contactEmail` — look up a specific applicant
- `vacancyDuration` — duration analysis
- `propertyType` — property mix analysis

---

## API Endpoints

### POST /api/submissions

**Called automatically** by the app after every quote calculation. You do not need to call this manually.

```
POST /api/submissions
Content-Type: application/json

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

---

### GET /api/submissions

Retrieve a paginated list of submissions. Use this to build a management dashboard or export data.

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

### GET /api/analytics

Returns pre-aggregated analytics across all submissions. No parameters required.

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
    { "reason": "Properties vacant for more than 5 years...", "count": 18 },
    { "reason": "Mobile and manufactured homes...", "count": 12 }
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

**Using this data:**
- Connect to this endpoint from any BI tool (Power BI, Tableau, Metabase)
- Fetch from a spreadsheet via the built-in `=WEBSERVICE()` formula (Excel) or `IMPORTDATA()` (Google Sheets)
- Build a custom React dashboard page at `/dashboard`

---

## Viewing Data with Prisma Studio

Prisma Studio is a free visual database browser built into Prisma:

```bash
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can:
- View all submissions in a table
- Filter and sort by any column
- Edit individual records
- Export selected rows to CSV

---

## Analytics — What You Can Measure

With the data saved, you can run analytics on:

### Conversion & Outcomes
- Accept / Decline / Refer rate over time
- How rates change by province
- Which underwriting rules fire most often (top decline reasons)
- What % of applications are referred vs declined in each province

### Pricing
- Average, min, max annual premium by province
- Premium distribution histogram
- Impact of deductible choice on final premium
- How property value correlates with premium

### Risk Profile
- Most common property types
- Vacancy duration distribution
- Security measure adoption rates
- Pool prevalence by province

### Operational
- Daily/weekly submission volume
- Time-of-day submission patterns
- Email domains (corporate vs personal)
- Session abandonment (sessions with no matching submission)

---

## Exporting Data to Excel

**Option 1 — Prisma Studio CSV**
1. Run `npx prisma studio`
2. Open the `Submission` table
3. Select all rows, click "Export as CSV"

**Option 2 — Direct SQLite query**

Install DB Browser for SQLite (free, open source) and open `prisma/submissions.db`. Run any SQL query and export results to CSV.

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
DATABASE_URL="file:./prisma/submissions.db"

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

This applies all existing migrations to your new PostgreSQL database. Your data is now in the cloud.

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

3. Extract and save the value in `src/app/api/submissions/route.ts`:

```typescript
heatingType: getString("heating_type") || null,
```

That's it — no other files need changing.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `PrismaClientInitializationError` | Run `npx prisma generate` then restart `npm run dev` |
| `DATABASE_URL` not found | Make sure `.env` exists in the project root with `DATABASE_URL=...` |
| Migration fails | Check that the `prisma/` directory is writable and `submissions.db` isn't locked |
| API returns 500 | Check the terminal running `npm run dev` for the full error message |
| Data not saving in prod | Ensure the server process can write to the database file (SQLite) or that `DATABASE_URL` is set as an environment variable on the server |
| `submissions.db` not found | Run `npx prisma migrate dev --name init` to create the database |
| Prisma Client out of sync | Run `npx prisma generate` after any schema change |
