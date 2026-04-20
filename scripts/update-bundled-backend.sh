#!/usr/bin/env bash
# Run this whenever a new Hermes Agent release is available.
set -euo pipefail

HERMES_DIR="/home/henry/.hermes/hermes-agent"

echo "Pulling latest Hermes Agent..."
cd "$HERMES_DIR"
git pull origin main

echo "Rebuilding bundled backend..."
cd "$(dirname "$0")/.."
npm run build:backend

echo "Update complete. Run 'npm run dist:win' to build a new installer."
