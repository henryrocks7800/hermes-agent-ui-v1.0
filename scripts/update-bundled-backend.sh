#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────────
# update-bundled-backend.sh
#
# Pulls the latest Hermes Agent source and reinstalls.
# Works on both the bundled copy and the user's local ~/.hermes install.
#
# Usage:  npm run update:backend
# ────────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Try bundled copy first, fall back to user's local install
BUNDLED_DIR="$(cd "$(dirname "$0")/.." && pwd)/bundled-backend/hermes-backend"
LOCAL_DIR="$HOME/.hermes/hermes-agent"

if [ -d "$BUNDLED_DIR/.git" ]; then
  TARGET_DIR="$BUNDLED_DIR"
elif [ -d "$LOCAL_DIR/.git" ]; then
  TARGET_DIR="$LOCAL_DIR"
else
  echo "ERROR: No Hermes Agent installation found."
  echo "       Run 'npm run build:backend' first, or clone manually:"
  echo "       git clone https://github.com/nousresearch/hermes-agent.git $BUNDLED_DIR"
  exit 1
fi

echo "==> Updating Hermes Agent at: $TARGET_DIR"

# Pull latest
git -C "$TARGET_DIR" pull origin main
echo "==> Git pull complete."

# Reinstall
if command -v pip3 &>/dev/null; then
  echo "==> Reinstalling..."
  pip3 install -e "$TARGET_DIR" --quiet
elif command -v pip &>/dev/null; then
  echo "==> Reinstalling..."
  pip install -e "$TARGET_DIR" --quiet
else
  echo "WARNING: pip not found — skipping reinstall."
fi

echo "==> Update complete. Restart the app to use the new version."
