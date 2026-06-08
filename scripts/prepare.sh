#!/bin/bash
set -Eeuo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
