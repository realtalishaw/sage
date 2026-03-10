#!/usr/bin/env bash

# This script starts the per-user instance wrapper in the simplest possible
# local-dev shape so the request flow can be understood without extra setup.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

export INSTANCE_ID="${INSTANCE_ID:-dev-instance}"
export INSTANCE_WRAPPER_HOST="${INSTANCE_WRAPPER_HOST:-127.0.0.1}"
export INSTANCE_WRAPPER_PORT="${INSTANCE_WRAPPER_PORT:-3000}"
export INSTANCE_WRAPPER_SIGNING_KEY_ID="${INSTANCE_WRAPPER_SIGNING_KEY_ID:-dev-key}"
export INSTANCE_WRAPPER_SIGNING_SECRET="${INSTANCE_WRAPPER_SIGNING_SECRET:-dev-secret}"
export OC_GATEWAY_BASE_URL="${OC_GATEWAY_BASE_URL:-http://127.0.0.1:18789}"
export OC_HOOK_AGENT_ID="${OC_HOOK_AGENT_ID:-main}"
export OC_HOOK_PATH="${OC_HOOK_PATH:-/hooks/agent}"
export OC_USE_REAL_HOOKS="${OC_USE_REAL_HOOKS:-0}"

echo "Building instance-wrapper..."
pnpm --filter @sage/instance-wrapper build

echo "Starting instance-wrapper on http://${INSTANCE_WRAPPER_HOST}:${INSTANCE_WRAPPER_PORT}"
echo "Instance id: ${INSTANCE_ID}"
echo "Signing key id: ${INSTANCE_WRAPPER_SIGNING_KEY_ID}"
echo "OpenClaw mode: $([ "${OC_USE_REAL_HOOKS}" = "1" ] && echo 'real hooks' || echo 'simulated')"

exec pnpm --filter @sage/instance-wrapper start
