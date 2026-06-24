#!/bin/bash
set -Eeuo pipefail


PORT="${PORT:-5000}"


# Always run from the project root (wherever this script lives).
cd "$(cd "$(dirname "$0")/.." && pwd)"

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${PORT} is free."
      return
    fi
    echo "Port ${PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${PORT} cleared."
    fi
}

echo "Clearing port ${PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${PORT} for dev..."

# NODE_OPTIONS=--no-deprecation silences Node 20+'s DEP0169 warning
# (the legacy url.parse() in src/server.ts triggers it on every
# request). We can't switch to WHATWG URL because Next.js's
# RequestHandler expects UrlWithParsedQuery shape with .query —
# WHATWG URLs only expose .searchParams.
export NODE_OPTIONS="${NODE_OPTIONS:-} --no-deprecation"

pnpm tsx watch src/server.ts
