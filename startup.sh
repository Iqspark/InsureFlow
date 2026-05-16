#!/bin/bash
# Azure App Service startup script
# ─────────────────────────────────────────────────────────────────
# 1. Apply any pending database migrations (safe to run on every start)
# 2. Start the Next.js production server
#
# Set this file as the startup command in Azure App Service:
#   Configuration → General settings → Startup Command: bash startup.sh
# ─────────────────────────────────────────────────────────────────

set -e  # Exit immediately if any command fails

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Starting Next.js server..."
node server.js
