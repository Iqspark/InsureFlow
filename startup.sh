#!/bin/bash
# Azure App Service startup script
# Schema is applied by the CI pipeline before deploy (npx prisma db push).
# This script only seeds the demo broker and starts the server.

set -e

echo "==> Seeding demo broker account..."
node prisma/seed.js

echo "==> Starting Next.js server..."
node server.js
