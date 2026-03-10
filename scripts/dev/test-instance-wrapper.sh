#!/usr/bin/env bash

# This script performs a local smoke test against the running instance wrapper.
# It is meant to show the full request lifecycle in a way that is easy to follow:
# health check -> accepted task -> later status poll.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

export INSTANCE_ID="${INSTANCE_ID:-dev-instance}"
export INSTANCE_WRAPPER_PORT="${INSTANCE_WRAPPER_PORT:-3000}"
export INSTANCE_WRAPPER_SIGNING_KEY_ID="${INSTANCE_WRAPPER_SIGNING_KEY_ID:-dev-key}"
export INSTANCE_WRAPPER_SIGNING_SECRET="${INSTANCE_WRAPPER_SIGNING_SECRET:-dev-secret}"

echo
echo "1. Health check"
curl -s "http://127.0.0.1:${INSTANCE_WRAPPER_PORT}/api/health"
echo

echo
echo "2. Submit signed task"
node --input-type=module <<'EOF'
import crypto from 'node:crypto';

const instanceId = process.env.INSTANCE_ID ?? 'dev-instance';
const port = process.env.INSTANCE_WRAPPER_PORT ?? '3000';
const keyId = process.env.INSTANCE_WRAPPER_SIGNING_KEY_ID ?? 'dev-key';
const secret = process.env.INSTANCE_WRAPPER_SIGNING_SECRET ?? 'dev-secret';

const body = {
  createdAt: new Date().toISOString(),
  idempotencyKey: 'idem-123',
  instanceId,
  task: {
    title: 'Build landing page',
    instructions: 'Create a simple landing page for a bakery.',
    kind: 'build',
  },
  taskId: 'task-123',
  traceId: 'trace-123',
  runtime: {
    priority: 'normal',
    sandbox: 'preferred',
  },
  session: {
    continuity: 'reuse',
    sessionKey: 'user-1/default',
  },
  userId: 'user-1',
};

const rawBody = JSON.stringify(body);
const timestamp = new Date().toISOString();
const canonical = [
  '2026-03-09',
  timestamp,
  body.traceId,
  body.instanceId,
  body.taskId,
  body.idempotencyKey,
  rawBody,
].join('\n');
const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

const response = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-sage-contract-version': '2026-03-09',
    'x-sage-key-id': keyId,
    'x-sage-signature': signature,
    'x-sage-timestamp': timestamp,
    'x-sage-trace-id': body.traceId,
    'x-sage-instance-id': body.instanceId,
    'x-sage-task-id': body.taskId,
    'x-sage-idempotency-key': body.idempotencyKey,
  },
  body: rawBody,
});

console.log('status:', response.status);
console.log('headers:', Object.fromEntries(response.headers.entries()));
console.log('body:', await response.text());
EOF

echo
echo "3. Wait for the fake OpenClaw client to complete the task"
sleep 1

echo
echo "4. Poll task status"
curl -s "http://127.0.0.1:${INSTANCE_WRAPPER_PORT}/api/tasks/task-123"
echo
