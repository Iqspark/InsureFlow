# Deployment Guide — Azure App Service

This guide walks you through the complete process:
1. Push the code to GitHub
2. Provision Azure resources
3. Provision the production database (Postgres / Neon)
4. Configure GitHub secrets and App Service settings
5. First deployment and ongoing workflow

> **Security note:** Every connection string, key, and password in this guide is a placeholder (`<...>`). Never paste a real secret into a doc or commit it. Real values live only in GitHub Secrets and Azure App Service settings.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Push Code to GitHub](#step-1--push-code-to-github)
4. [Step 2 — Provision Azure Resources](#step-2--provision-azure-resources)
5. [Step 3 — Provision the Production Database](#step-3--provision-the-production-database)
6. [Step 4 — Configure GitHub Secrets](#step-4--configure-github-secrets)
7. [Step 5 — Set App Service Environment Variables](#step-5--set-app-service-environment-variables)
8. [Step 6 — Trigger the First Deployment](#step-6--trigger-the-first-deployment)
9. [Step 7 — Verify the Deployment](#step-7--verify-the-deployment)
10. [Ongoing Workflow](#ongoing-workflow)
11. [Rollback](#rollback)
12. [Cost Estimate](#cost-estimate)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Developer machine
    │  git push origin main
    ▼
GitHub Repository
    │  Triggers .github/workflows/azure-deploy.yml
    ▼
GitHub Actions Runner (ubuntu-latest, Node 22)
    ├─ npm ci
    ├─ npx prisma generate
    ├─ npx tsc --noEmit                  (type-check)
    ├─ npm run build                      (Next.js standalone output + PWA)
    ├─ npx prisma db push + node prisma/seed.js   (main pushes only)
    └─ Assemble deploy package (.next/standalone + .next artifacts +
       static + public + prisma + knowledge + startup.sh) → deploy.zip
           │  azure/webapps-deploy@v3
           ▼
    Azure App Service (Linux, Node 22)
           │  On startup: bash startup.sh → node server.js
           ├─► PostgreSQL (Neon or Azure Database for PostgreSQL)
           └─► https://insureflow-demo.azurewebsites.net
```

### Why standalone output?

`next.config.js` sets `output: "standalone"`. This bundles only the production Node.js files (plus a trimmed `node_modules`) into `.next/standalone/`, so Azure runs `node server.js` with no `npm install` and faster cold starts. The same config also wraps the app with `@ducanh2912/next-pwa` and declares `serverComponentsExternalPackages` for `pdf-parse`, `pdfjs-dist`, and `@react-pdf/renderer` (used for PDF generation).

> **Framework versions:** the app runs **Next.js 16 / React 19** (App Router, async route `params`). This requires a recent Node runtime — CI and App Service both use **Node 22 LTS**.

### Public URL for emailed links

Payment (`/pay/<token>`) and customer-portal (`/portal/<token>`) links are emailed to applicants, so they must resolve to the real public host. At request time the app derives the base URL from the incoming `x-forwarded-host` / `Host` header plus `x-forwarded-proto` — which Just Works on Azure App Service, where TLS is terminated upstream and the platform sets those forwarded headers. **Still set `NEXTAUTH_URL` to the real public URL** (NextAuth uses it for callbacks/session, and it's the fallback when no forwarded headers are present).

### What the build expects

The workflow runs `npx prisma db push --accept-data-loss` and `node prisma/seed.js` against the production `DATABASE_URL` on pushes to `main` — the schema is applied with `db push` (not `migrate deploy`), and demo brokers are seeded. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` must be present at **build time** because it is inlined into the client bundle.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ (CI uses 22) | [nodejs.org](https://nodejs.org) |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Azure CLI | Latest | `winget install Microsoft.AzureCLI` |
| GitHub account | — | [github.com](https://github.com) |
| Azure subscription | — | [portal.azure.com](https://portal.azure.com) |

```bash
az login
az account show   # Confirm the correct subscription is active
```

---

## Step 1 — Push Code to GitHub

Create a private GitHub repository (do not initialise with README/.gitignore — the project already has them), then:

```bash
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

Confirm the repo shows the source files, the `docs/` folder, and `.github/workflows/azure-deploy.yml`.

---

## Step 2 — Provision Azure Resources

CLI is shown here. Set placeholders for your own names:

```bash
RESOURCE_GROUP="rg-insureflow"
LOCATION="canadacentral"
APP_SERVICE_PLAN="plan-insureflow"
WEBAPP_NAME="<your-unique-webapp-name>"   # becomes <name>.azurewebsites.net
```

```bash
# Resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# App Service plan (Linux). B1 ≈ $13 USD/mo; use F1 for a free demo tier.
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Web App (Node 22 — Node 20 is no longer offered on Linux App Service)
az webapp create \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "NODE:22-lts"

# Startup command + port (Next.js standalone listens on 3000)
az webapp config set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "bash startup.sh"

az webapp config appsettings set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITES_PORT=3000 NODE_ENV=production
```

> Run `az webapp list-runtimes --os-type linux` to see currently supported Node versions.

---

## Step 3 — Provision the Production Database

The app uses **PostgreSQL**. App Service has an ephemeral filesystem, so a managed Postgres is required — a local file DB would be wiped on every redeploy.

**Recommended: Neon (free tier).** Sign up at [neon.tech](https://neon.tech), create a project, and copy the connection string. It looks like:

```
postgresql://<user>:<YOUR_DB_PASSWORD>@<your-host>.neon.tech/<db_name>?sslmode=require
```

**Alternative: Azure Database for PostgreSQL Flexible Server.**

```bash
az postgres flexible-server create \
  --name <your-pg-server-name> \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user <db_admin_user> \
  --admin-password "<YOUR_DB_PASSWORD>" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --server-name <your-pg-server-name> \
  --resource-group $RESOURCE_GROUP \
  --database-name <db_name>
```

Connection string for Azure Postgres:

```
postgresql://<db_admin_user>:<YOUR_DB_PASSWORD>@<your-pg-server-name>.postgres.database.azure.com:5432/<db_name>?sslmode=require
```

If using Azure Postgres, add firewall rules for the App Service outbound IPs (`az webapp show ... --query outboundIpAddresses`). Neon accepts connections without per-IP rules.

> The Prisma schema already uses `provider = "postgresql"`. The pipeline runs `prisma db push` on startup builds, so tables are created automatically — no manual migration step needed.

---

## Step 4 — Configure GitHub Secrets

GitHub → repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

These map to what `.github/workflows/azure-deploy.yml` reads:

| Secret | Required | Value |
|---|---|---|
| `AZURE_WEBAPP_NAME` | Yes | App Service name (e.g. `<your-unique-webapp-name>`) |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Yes | Entire contents of the App Service publish profile XML (see below) |
| `DATABASE_URL` | Yes | Postgres connection string from Step 3 |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Full public URL, e.g. `https://<your-unique-webapp-name>.azurewebsites.net` |
| `OPENAI_API_KEY` | Optional | `sk-...` — Help Navigator, change-answer, AI underwriter recommendation. Omit and those AI features show a "not configured" message |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | **Build-time** key for address autocomplete + map (inlined into the client bundle — must be present when the build runs) |
| `RESEND_API_KEY` / `SMTP_FROM` | Optional | Real email via Resend (preferred). Resend needs a **verified sending domain** (otherwise it only delivers to the account owner). `SMTP_FROM` sets the From address |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional | Real email via SMTP (fallback if Resend isn't set); omit all to use Ethereal test mode |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Optional | Real Stripe hosted checkout. Without them, payment falls back to the simulated (no-charge) gateway. See [Stripe webhook](#stripe-webhook-cloud-vs-local) below |
| `SENTRY_DSN` | Optional | Error monitoring across the money path; omit to log to console only |
| `UNDERWRITER_EMAIL` | Optional | Back-office inbox notified when a policy is first bound |

> **The publish profile is a secret, never a committed file.** It contains deployment credentials. Get it via the Azure Portal (App Service → **Get publish profile**) or `az webapp deployment list-publishing-profiles --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --xml`, then paste the entire XML as `AZURE_WEBAPP_PUBLISH_PROFILE`.

---

## Step 5 — Set App Service Environment Variables

The build inlines some values, but the **runtime** App Service also needs the full set so the deployed server can connect to the database, sign sessions, send email, and call the AI APIs.

```bash
az webapp config appsettings set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DATABASE_URL="postgresql://<user>:<YOUR_DB_PASSWORD>@<your-host>/<db_name>?sslmode=require" \
    NEXTAUTH_SECRET="<random-32+-char-string>" \
    NEXTAUTH_URL="https://<your-unique-webapp-name>.azurewebsites.net" \
    OPENAI_API_KEY="sk-..." \
    NODE_ENV="production" \
    WEBSITES_PORT="3000"
```

### Full list of runtime environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Full public URL of the app |
| `OPENAI_API_KEY` | Optional | Help Navigator, change-answer, AI underwriter recommendation. Without it those features show "not configured" |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Address autocomplete + map. Must also be set at **build time** (GitHub secret) since it is inlined into the client bundle |
| `RESEND_API_KEY` | Optional | Real email via Resend (preferred sender). Needs a **verified domain** to deliver to anyone but the account owner |
| `SMTP_HOST` | Optional | e.g. `smtp.gmail.com` (SMTP fallback) |
| `SMTP_PORT` | Optional | Usually `587` |
| `SMTP_USER` | Optional | SMTP login |
| `SMTP_PASS` | Optional | App Password / SMTP password |
| `SMTP_FROM` | Optional | `"InsureFlow <noreply@yourapp.com>"` — the From address (used by both Resend and SMTP) |
| `STRIPE_SECRET_KEY` | Optional | Enables real Stripe hosted checkout. Absent → simulated (no-charge) gateway |
| `STRIPE_WEBHOOK_SECRET` | Optional | Signing secret for the `/api/stripe/webhook` endpoint (the authoritative "paid" signal). Required when Stripe is enabled |
| `SENTRY_DSN` | Optional | Error monitoring across buy/checkout/webhook/pay/finalize/adjust/cancel/portal. Absent → console logging only |
| `UNDERWRITER_EMAIL` | Optional | Back-office inbox notified when a policy is first bound. Leave unset to skip |

> **Email in production:** `deliver()` tries **Resend → SMTP → Ethereal** in that order. Set `RESEND_API_KEY` (+ a verified domain) or the SMTP vars for real delivery; with neither, the app falls back to Ethereal (test mode) and returns a `previewUrl`.

### Stripe webhook — cloud vs. local

The webhook is the authoritative confirmation that a customer paid. Configure it per environment:

- **Cloud (Azure):** in the **Stripe Dashboard → Developers → Webhooks**, register an endpoint at `https://<your-unique-webapp-name>.azurewebsites.net/api/stripe/webhook` (event `checkout.session.completed`), then copy its signing secret into the `STRIPE_WEBHOOK_SECRET` App Setting. `stripe listen` does **not** apply to a deployed app.
- **Local:** use the Stripe CLI — `stripe listen --forward-to localhost:3000/api/stripe/webhook` — and use the signing secret it prints.

A return-page safety net (`/pay/<token>?paid=1` re-checks the Checkout Session) finalizes the policy even if the webhook is dropped or delayed, so a missed webhook won't leave a paid customer unconfirmed. Public pay/portal links expire 30 days after they're issued.

### knowledge/ folder in production

The Help Navigator reads `.md`/`.txt` files from `knowledge/` at runtime. The workflow copies this folder into the deploy package automatically. To update FAQ docs after deployment, push to `main` to redeploy.

---

## Step 6 — Trigger the First Deployment

Pushing to `main` runs the pipeline:

```bash
git commit --allow-empty -m "chore: trigger initial deployment"
git push origin main
```

Watch **GitHub → Actions**. The workflow has two jobs:

1. **Build & Type-check** — runs on every push and PR (`npm ci`, prisma generate, `tsc --noEmit`, `npm run build`, assemble `deploy.zip`).
2. **Deploy to Azure App Service** — runs only on pushes to `main` (`azure/webapps-deploy@v3` with the publish profile).

PRs run the build job only; they never deploy.

---

## Step 7 — Verify the Deployment

```bash
curl -I https://$WEBAPP_NAME.azurewebsites.net
az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP
```

Or open `https://<your-unique-webapp-name>.azurewebsites.net`, log in with a seeded demo broker, and run a test quote.

---

## Ongoing Workflow

```
1. git checkout -b feature/<name>
2. Make changes, test with: npm run dev
3. git push origin feature/<name>
4. Open a PR → Build & Type-check job runs
5. Merge to main → Deploy job runs automatically
6. Verify at https://<your-unique-webapp-name>.azurewebsites.net
```

Only merges/pushes to `main` deploy.

---

## Rollback

- **Via GitHub:** re-run the last successful deploy job from the Actions tab.
- **Via Azure:** if using deployment slots, swap back to the previous slot.
- **Database:** Prisma does not auto-roll-back a `db push`. Fix forward with a corrective schema change, or restore the Postgres provider's point-in-time backup (Neon and Azure Postgres both support this).

---

## Cost Estimate

| Resource | SKU | Cost |
|---|---|---|
| App Service | F1 (Free) | $0 (sleeps after ~20 min idle; slow first request) |
| App Service | B1 | ~$13 USD/mo (always on) |
| Database | Neon free tier | $0 |

For a low-traffic demo, F1 + Neon free tier runs at $0/month. Use the [Azure Pricing Calculator](https://azure.microsoft.com/en-ca/pricing/calculator/) to model production load.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Build fails: `Cannot find module '@prisma/client'` | Client not generated | The workflow runs `npx prisma generate`; ensure that step is intact |
| Deploy fails: `Publish profile not valid` | Wrong/expired secret | Re-download the publish profile, update `AZURE_WEBAPP_PUBLISH_PROFILE` |
| App shows 500 after deploy | `DATABASE_URL` not set on App Service | Check App Service → Configuration |
| `PrismaClientInitializationError` | DB unreachable | Verify `DATABASE_URL`; for Azure Postgres check firewall rules |
| `Error: Cannot find module './server.js'` | Standalone build not assembled | Check the "Assemble deployment package" step in the workflow |
| SSL error to Postgres | Missing `?sslmode=require` | Append it to `DATABASE_URL` |
| Maps/autocomplete missing in prod | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` not set at build time | Add it as a GitHub secret and redeploy |
| App times out on first hit | F1 cold start | Expected on Free tier; scale to B1 for always-on |

### Viewing live logs

```bash
az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP
```
