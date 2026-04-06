#!/bin/bash
# install-hermes-backend.sh
# Installs Hermes Agent backend as a dependency

set -e

echo "Installing Hermes Agent backend..."

# Clone the backend repo if not present
if [ ! -d "hermes-agent" ]; then
  git clone https://github.com/henryrocks7800/hermes-agent.git
fi

cd hermes-agent

# Install dependencies
if command -v pnpm &> /dev/null; then
  pnpm install
elif command -v npm &> /dev/null; then
  npm install
else
  echo "Error: pnpm or npm required"
  exit 1
fi

echo "✅ Hermes Agent backend installed"
echo "Run with: cd hermes-agent && npm start"
