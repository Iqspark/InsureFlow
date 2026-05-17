#!/bin/bash
# Azure App Service startup script
# ─────────────────────────────────────────────────────────────────
# Runs on every cold start / redeploy.
# 1. Push schema to the database (creates tables if they don't exist)
# 2. Seed the demo broker account (upsert — safe to run multiple times)
# 3. Start the Next.js production server
# ─────────────────────────────────────────────────────────────────

set -e

echo "==> Applying database schema..."
npx prisma db push --accept-data-loss

echo "==> Seeding demo broker account..."
node prisma/seed.js

echo "==> Starting Next.js server..."
node server.js
