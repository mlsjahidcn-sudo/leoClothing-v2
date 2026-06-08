#!/bin/bash
set -Eeuo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

PORT="${PORT:-5000}"


start_service() {
    echo "Starting HTTP service on port ${PORT} for deploy..."
    node dist/server.js
}

echo "Starting HTTP service on port ${PORT} for deploy..."
start_service
