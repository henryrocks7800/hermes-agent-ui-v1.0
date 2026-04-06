#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────────
# build-bundled-backend.sh
#
# Clones (or updates) the NousResearch Hermes Agent repo into
# bundled-backend/hermes-backend/ and installs it so the Electron
# app can spawn the gateway on launch.
#
# Usage:  npm run build:backend
# ────────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="https://github.com/nousresearch/hermes-agent.git"
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/bundled-backend/hermes-backend"

echo "==> Hermes Agent backend build"
echo "    Target: $TARGET_DIR"

# Clone or pull
if [ -d "$TARGET_DIR/.git" ]; then
  echo "==> Existing clone found — pulling latest..."
  git -C "$TARGET_DIR" pull origin main
else
  echo "==> Cloning Hermes Agent..."
  mkdir -p "$(dirname "$TARGET_DIR")"
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
fi

# Install Python dependencies
if command -v pip3 &>/dev/null; then
  echo "==> Installing Python dependencies..."
  pip3 install -e "$TARGET_DIR" --quiet
elif command -v pip &>/dev/null; then
  echo "==> Installing Python dependencies..."
  pip install -e "$TARGET_DIR" --quiet
else
  echo "WARNING: pip not found — skipping Python install."
  echo "         You will need to run:  pip install -e $TARGET_DIR"
fi

echo "==> Backend build complete."
echo "    Run 'npm run dist:full' to package the app with the backend."
