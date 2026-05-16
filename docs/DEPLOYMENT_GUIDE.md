# Deployment Guide — Azure App Service

This guide walks you through the complete process:
1. Push the code to GitHub
2. Provision Azure resources
3. Connect the pipeline
4. Configure the production database
5. First deployment and ongoing workflow

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Push Code to GitHub](#step-1--push-code-to-github)
4. [Step 2 — Provision Azure Resources](#step-2--provision-azure-resources)
5. [Step 3 — Set Up the Production Database](#step-3--set-up-the-production-database)
6. [Step 4 — Configure GitHub Secrets](#step-4--configure-github-secrets)
7. [Step 5 — Set App Service Environment Variables](#step-5--set-app-service-environment-variables)
8. [Step 6 — Trigger the First Deployment](#step-6--trigger-the-first-deployment)
9. [Step 7 — Verify the Deployment](#step-7--verify-the-deployment)
10. [Ongoing Workflow — Deploy on Every Merge](#ongoing-workflow--deploy-on-every-merge)
11. [Azure DevOps Alternative](#azure-devops-alternative)
12. [Environment Promotion (Dev → Staging → Prod)](#environment-promotion-dev--staging--prod)
13. [Rollback](#rollback)
14. [Cost Estimate](#cost-estimate)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Developer machine
    │
    │  git push origin main
    ▼
GitHub Repository
    │
    │  Triggers GitHub Actions workflow
    ▼
GitHub Actions Runner (ubuntu-latest)
    ├─ npm ci
    ├─ npx prisma generate
    ├─ npx tsc --noEmit         (type-check)
    ├─ npm run build             (Next.js standalone output)
    └─ Assemble deploy package
           │
           │  azure/webapps-deploy@v3
           ▼
    Azure App Service (Linux, Node 20)
           │
           │  On startup: bash startup.sh
           │    ├─ npx prisma migrate deploy
           │    └─ node server.js  (Next.js standalone)
           │
           ├─► Azure Database for PostgreSQL Flexible Server
           │     └─ submissions table
           │
           └─► https://your-app.azurewebsites.net
```

### Why standalone output?

`next.config.js` sets `output: "standalone"`. This:
- Bundles only the production Node.js files into `.next/standalone/`
- Includes a trimmed `node_modules` — no `npm install` needed on Azure
- Reduces cold-start time significantly

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Azure CLI | Latest | `winget install Microsoft.AzureCLI` |
| GitHub account | — | [github.com](https://github.com) |
| Azure subscription | — | [portal.azure.com](https://portal.azure.com) |

Verify your Azure CLI login:
```bash
az login
az account show   # Confirm the correct subscription is active
```

---

## Step 1 — Push Code to GitHub

### 1a. Create a GitHub repository

Go to [github.com/new](https://github.com/new):
- Repository name: `vacant-home-insurance-quote` (or any name)
- Visibility: Private (recommended)
- Do NOT initialise with README or .gitignore (the project already has these)
- Click **Create repository**

Copy the remote URL shown on the next screen (e.g. `https://github.com/your-org/vacant-home-insurance-quote.git`).

### 1b. Push the local repo

The initial commit was already created locally. Run:

```bash
git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
git push -u origin main
```

### 1c. Verify

Go to your GitHub repo — you should see all the source files, the `docs/` folder, and `.github/workflows/` with the two workflow files.

---

## Step 2 — Provision Azure Resources

You can provision resources via the Azure Portal (GUI) or Azure CLI. CLI is shown here — it is faster and repeatable.

### 2a. Set variables (run these in your terminal first)

```bash
# Customise these for your project
RESOURCE_GROUP="rg-vhi-quote-prod"
LOCATION="canadacentral"            # Closest Azure region to your users
APP_SERVICE_PLAN="plan-vhi-prod"
WEBAPP_NAME="vhi-quote-app"         # Must be globally unique — becomes the subdomain
PG_SERVER_NAME="pg-vhi-prod"        # Must be globally unique
PG_ADMIN_USER="vhiadmin"
PG_ADMIN_PASSWORD="YourStr0ngP@ssword!"   # Change this
PG_DB_NAME="vhi_submissions"
```

### 2b. Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 2c. Create App Service Plan (Linux, B1 tier)

```bash
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux
```

> **Tier guide:**
> - `B1` — Basic, ~$13 CAD/month. Good for dev/test.
> - `P1v3` — Premium, ~$75 CAD/month. Recommended for production traffic.

### 2d. Create the Web App (Node 20)

```bash
az webapp create \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "NODE:20-lts"
```

### 2e. Configure startup command

```bash
az webapp config set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "bash startup.sh"
```

### 2f. Set the port (Next.js uses 3000, App Service forwards from 80/443)

```bash
az webapp config appsettings set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITES_PORT=3000 NODE_ENV=production
```

---

## Step 3 — Set Up the Production Database

SQLite is fine for local development but **not suitable for production** on Azure App Service — the file system is ephemeral and the database would be wiped on every redeploy.

Use **Azure Database for PostgreSQL Flexible Server** instead.

### 3a. Create PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --name $PG_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $PG_ADMIN_USER \
  --admin-password $PG_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0
```

> `Standard_B1ms` (Burstable) costs approximately $16 CAD/month. Upgrade to `Standard_D2s_v3` for production load.

### 3b. Create the database

```bash
az postgres flexible-server db create \
  --server-name $PG_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --database-name $PG_DB_NAME
```

### 3c. Allow App Service to connect

```bash
# Get App Service outbound IPs
OUTBOUND_IPS=$(az webapp show \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "outboundIpAddresses" \
  --output tsv)

# Add a firewall rule for each IP
IFS=',' read -ra IPS <<< "$OUTBOUND_IPS"
for IP in "${IPS[@]}"; do
  az postgres flexible-server firewall-rule create \
    --name $PG_SERVER_NAME \
    --resource-group $RESOURCE_GROUP \
    --rule-name "AppService-$IP" \
    --start-ip-address $IP \
    --end-ip-address $IP
done
```

### 3d. Build your connection string

```
postgresql://vhiadmin:YourStr0ngP@ssword!@pg-vhi-prod.postgres.database.azure.com:5432/vhi_submissions?sslmode=require
```

Keep this string — you will need it in Steps 4 and 5.

### 3e. Update Prisma schema for PostgreSQL

In `prisma/schema.prisma`, change the provider:

```prisma
datasource db {
  provider = "postgresql"    # ← change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Commit and push this change. The pipeline will run `prisma migrate deploy` on startup, which creates the tables automatically.

---

## Step 4 — Configure GitHub Secrets

GitHub Secrets store sensitive values that the Actions workflow reads.

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add these three secrets:

### Secret 1: `AZURE_WEBAPP_NAME`

Value: the App Service name you chose (e.g. `vhi-quote-app`)

### Secret 2: `DATABASE_URL`

Value: the PostgreSQL connection string from Step 3d:
```
postgresql://vhiadmin:YourStr0ngP@ssword!@pg-vhi-prod.postgres.database.azure.com:5432/vhi_submissions?sslmode=require
```

### Secret 3: `AZURE_WEBAPP_PUBLISH_PROFILE`

Download the publish profile from Azure:

**Via Portal:**
1. Open [portal.azure.com](https://portal.azure.com)
2. Navigate to your App Service (`vhi-quote-app`)
3. Click **Get publish profile** (top bar)
4. Open the downloaded `.PublishSettings` file in a text editor
5. Copy the **entire file contents** and paste as the secret value

**Via CLI:**
```bash
az webapp deployment list-publishing-profiles \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --xml
```

Copy the entire XML output as the secret value.

---

## Step 5 — Set App Service Environment Variables

The App Service needs the `DATABASE_URL` at runtime (for `prisma migrate deploy` and the API routes). Set it via CLI:

```bash
az webapp config appsettings set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DATABASE_URL="postgresql://vhiadmin:YourStr0ngP@ssword!@pg-vhi-prod.postgres.database.azure.com:5432/vhi_submissions?sslmode=require" \
    NODE_ENV="production" \
    WEBSITES_PORT="3000"
```

Or via Portal: App Service → **Configuration** → **Application settings** → **+ New application setting**.

---

## Step 6 — Trigger the First Deployment

Push any change to `main` to trigger the pipeline:

```bash
# Make a trivial change to trigger the pipeline
echo "" >> README.md
git add README.md
git commit -m "chore: trigger initial deployment"
git push origin main
```

Watch the pipeline run in **GitHub** → **Actions** tab.

The workflow has two stages:
1. **Build & Type-check** (~2 minutes) — always runs
2. **Deploy to Azure App Service** (~1 minute) — only on `main` pushes

---

## Step 7 — Verify the Deployment

```bash
# Check the app is responding
curl -I https://$WEBAPP_NAME.azurewebsites.net

# Check the API is working
curl https://$WEBAPP_NAME.azurewebsites.net/api/analytics

# Check recent submissions
curl "https://$WEBAPP_NAME.azurewebsites.net/api/submissions?limit=5"
```

Or open `https://vhi-quote-app.azurewebsites.net` in your browser and complete a test quote.

Check the App Service logs if something is wrong:

```bash
# Stream live logs
az webapp log tail \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Ongoing Workflow — Deploy on Every Merge

After initial setup, the day-to-day workflow is:

```
1. Create a feature branch:   git checkout -b feature/add-questions
2. Make changes locally:      edit src/data/questions.ts
3. Test locally:              npm run dev
4. Push the branch:           git push origin feature/add-questions
5. Open a Pull Request on GitHub
   └─► PR Checks workflow runs (type-check + build) — ~3 minutes
6. Review and merge the PR into main
   └─► Deploy workflow runs automatically — ~3 minutes
7. Verify at https://vhi-quote-app.azurewebsites.net
```

**PRs never deploy** — only merges to `main` trigger a deployment.

---

## Azure DevOps Alternative

If your organisation uses Azure DevOps instead of GitHub:

### Repo

Push to Azure DevOps Repos instead of GitHub:
```bash
git remote add origin https://dev.azure.com/YOUR-ORG/YOUR-PROJECT/_git/vhi-quote
git push -u origin main
```

### Pipeline

The file `azure-pipelines.yml` at the root of the project is the Azure DevOps pipeline definition. To activate it:

1. Azure DevOps → **Pipelines** → **New pipeline**
2. Select **Azure Repos Git**
3. Select your repository
4. Choose **Existing Azure Pipelines YAML file**
5. Select `/azure-pipelines.yml`
6. Click **Run**

### Variables

Create a Variable Group called `vhi-production` (Library → Variable Groups):

| Name | Value | Secret? |
|---|---|---|
| `AZURE_WEBAPP_NAME` | `vhi-quote-app` | No |
| `DATABASE_URL` | `postgresql://...` | **Yes** |

Link the variable group to the pipeline: Edit pipeline → Variables → Variable groups → Link variable group.

### Service Connection

Create an Azure Resource Manager service connection named `AzureServiceConnection`:
Project Settings → Service connections → New service connection → Azure Resource Manager → Service principal (automatic).

---

## Environment Promotion (Dev → Staging → Prod)

For a multi-environment setup, create separate App Services and branch-based deployments:

| Branch | Environment | App Service |
|---|---|---|
| `develop` | Development | `vhi-quote-dev` |
| `staging` | Staging | `vhi-quote-staging` |
| `main` | Production | `vhi-quote-app` |

In `.github/workflows/azure-deploy.yml`, extend the `on.push.branches` and `deploy` job to handle each branch with its own secret set.

Deployment slots (Azure feature):
```bash
# Create a "staging" slot on the production App Service
az webapp deployment slot create \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# After testing in staging, swap to production with zero downtime
az webapp deployment slot swap \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production
```

---

## Rollback

### Instant rollback via GitHub

Go to the failed deployment's GitHub Actions run → click **Re-run jobs** on the previous successful run.

### Rollback via Azure CLI

```bash
# List recent deployments
az webapp deployment list \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# Redeploy a specific deployment ID
az webapp deployment source sync \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP
```

### Database rollback

If a migration caused issues, Prisma does not automatically roll back. Options:
1. Fix forward — write a new migration that reverses the change
2. Use a PostgreSQL point-in-time restore:
```bash
az postgres flexible-server restore \
  --source-server $PG_SERVER_NAME \
  --name $PG_SERVER_NAME-restored \
  --resource-group $RESOURCE_GROUP \
  --restore-time "2025-01-15T10:00:00Z"
```

---

## Cost Estimate

Monthly cost for a production deployment (Canada Central):

| Resource | SKU | Estimated CAD/month |
|---|---|---|
| App Service | B1 (dev) / P1v3 (prod) | $13 – $75 |
| PostgreSQL Flexible Server | Standard_B1ms | $16 |
| Bandwidth | First 5 GB free | $0 – $5 |
| **Total** | | **~$29 – $96 / month** |

Use the [Azure Pricing Calculator](https://azure.microsoft.com/en-ca/pricing/calculator/) to model your specific usage.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Build fails: `Cannot find module '@prisma/client'` | Prisma Client not generated | Add `npx prisma generate` step before build |
| Deploy fails: `Publish profile not valid` | Wrong secret value | Re-download publish profile from Azure, update secret |
| App shows 500 after deploy | `DATABASE_URL` not set on App Service | Check App Settings in Azure Portal |
| `PrismaClientInitializationError` | DB unreachable | Check firewall rules on PostgreSQL server; confirm `DATABASE_URL` is correct |
| `Error: Cannot find module './server.js'` | Standalone build not assembled correctly | Check the "Assemble deployment package" step in the workflow |
| `prisma migrate deploy` fails on startup | Wrong provider in schema.prisma | Change `provider = "sqlite"` to `provider = "postgresql"` |
| App times out (5xx) | App taking too long to start | Check startup logs: `az webapp log tail --name ... --resource-group ...` |
| SSL error connecting to PostgreSQL | Missing `?sslmode=require` in connection string | Append `?sslmode=require` to `DATABASE_URL` |
| CORS errors on API routes | Missing CORS headers | Next.js API routes handle this — check the request origin in the browser console |

### Viewing live logs

```bash
# Stream logs in real time
az webapp log tail \
  --name vhi-quote-app \
  --resource-group rg-vhi-quote-prod

# Or download recent logs
az webapp log download \
  --name vhi-quote-app \
  --resource-group rg-vhi-quote-prod \
  --log-file logs.zip
```
