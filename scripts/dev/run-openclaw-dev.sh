#!/usr/bin/env bash

# This script runs the OpenClaw fork in the dev profile Sage expects locally.
# It keeps the state isolated under ~/.openclaw-dev and starts the gateway on
# the dev port so the wrapper can forward tasks to it.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OPENCLAW_DIR="$ROOT_DIR/forks/openclaw"

if [ ! -d "$OPENCLAW_DIR" ]; then
  echo "OpenClaw fork not found at $OPENCLAW_DIR" >&2
  exit 1
fi

export OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-dev}"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw-dev}"
export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$OPENCLAW_STATE_DIR/openclaw.json}"

cd "$OPENCLAW_DIR"

# The fork uses its own workspace and lockfile, so we install dependencies there
# once before trying to run the gateway.
if [ ! -d node_modules ]; then
  echo "Installing OpenClaw dependencies..."
  pnpm install
fi

echo "Using OpenClaw config:"
echo "  $OPENCLAW_CONFIG_PATH"
echo
echo "Starting OpenClaw dev gateway..."
echo "  profile: $OPENCLAW_PROFILE"
echo "  state:   $OPENCLAW_STATE_DIR"

exec pnpm gateway:dev
