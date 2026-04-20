# bundled-backend/

This directory is NOT committed to git (see .gitignore).

To populate it for a release build:
  npm run build:backend

To update when a new Hermes Agent version is released:
  bash scripts/update-bundled-backend.sh

The contents are packaged into the Windows installer automatically by electron-builder.
