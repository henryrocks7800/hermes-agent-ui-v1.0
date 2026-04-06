#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────────
# build-bundled-backend.sh
#
# Builds the Hermes Agent backend for bundling with the Electron app.
#
# Modes:
#   --exe     Build standalone exe via PyInstaller (default, no Python needed by users)
#   --source  Clone source only (users need Python installed)
#
# Usage:  npm run build:backend           # builds standalone exe
#         npm run build:backend:source    # clones source only
# ────────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:---exe}"

if [ "$MODE" = "--exe" ]; then
  echo "==> Building standalone Hermes Agent exe via PyInstaller..."

  # Find Python
  if command -v python3 &>/dev/null; then
    PYTHON=python3
  elif command -v python &>/dev/null; then
    PYTHON=python
  elif command -v py &>/dev/null; then
    PYTHON=py
  else
    echo "ERROR: Python not found. Install Python 3.11+ to build the standalone exe."
    exit 1
  fi

  "$PYTHON" "$SCRIPT_DIR/build-hermes-exe.py"

elif [ "$MODE" = "--source" ]; then
  REPO_URL="https://github.com/nousresearch/hermes-agent.git"
  TARGET_DIR="$ROOT_DIR/bundled-backend/hermes-backend"

  echo "==> Hermes Agent source-only build"
  echo "    Target: $TARGET_DIR"

  if [ -d "$TARGET_DIR/.git" ]; then
    echo "==> Existing clone found — pulling latest..."
    git -C "$TARGET_DIR" pull origin main
  else
    echo "==> Cloning Hermes Agent..."
    mkdir -p "$(dirname "$TARGET_DIR")"
    git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
  fi

  if command -v pip3 &>/dev/null; then
    echo "==> Installing Python dependencies..."
    pip3 install -e "$TARGET_DIR" --quiet
  elif command -v pip &>/dev/null; then
    pip install -e "$TARGET_DIR" --quiet
  else
    echo "WARNING: pip not found — run: pip install -e $TARGET_DIR"
  fi

  echo "==> Source build complete."
else
  echo "Usage: $0 [--exe|--source]"
  exit 1
fi
