#!/usr/bin/env bash
# Run from WSL. Produces bundled-backend/ ready for electron-builder.
set -euo pipefail

HERMES_SRC="/home/henry/.hermes/hermes-agent"
OUT_DIR="$(dirname "$0")/../bundled-backend"

cd "$HERMES_SRC"

# Run PyInstaller with explicit hidden import for yaml (part of pyyaml)
# and include the core entrypoints used by the UI.
pyinstaller cli.py \
  --name hermes-backend \
  --onedir \
  --noconfirm \
  --hidden-import yaml \
  --hidden-import prompt_toolkit \
  --hidden-import pydantic \
  --distpath "$OUT_DIR"

echo "Done. Backend at: $OUT_DIR/hermes-backend/"
