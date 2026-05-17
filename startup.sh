#!/bin/bash
# Azure App Service startup script
# Schema and seed are handled by CI before deploy.
# This script only starts the Next.js server.

exec node server.js
