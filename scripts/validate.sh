#!/bin/bash
set -Eeuo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Running validate..."
pnpm validate
echo "✅ Validate passed!"
