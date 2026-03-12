#!/usr/bin/env bash

set -euo pipefail

API_URL="${PROVISIONING_API_URL:-http://127.0.0.1:4010}"
INSTANCE_NAME="${INSTANCE_NAME:-sage-api-$(date +%Y%m%d-%H%M%S)}"
REGION="${REGION:-nyc1}"

echo
echo "1. Health check"
curl -s "${API_URL}/health"
echo

echo
echo "2. Create instance"
RESPONSE="$(curl -s -X POST "${API_URL}/instances" -H 'content-type: application/json' -d "{\"name\":\"${INSTANCE_NAME}\",\"region\":\"${REGION}\"}")"
echo "${RESPONSE}"

IP_ADDRESS="$(RESPONSE_JSON="${RESPONSE}" node --input-type=module -e "const payload = JSON.parse(process.env.RESPONSE_JSON ?? '{}'); process.stdout.write(payload.ipAddress ?? '')")"

if [ -z "${IP_ADDRESS}" ]; then
  echo "No ipAddress in response." >&2
  exit 1
fi

echo
echo "3. Wrapper health on ${IP_ADDRESS}"
curl -s "http://${IP_ADDRESS}/api/health"
echo

echo
echo "4. Chat smoke test"
curl -sN -X POST "http://${IP_ADDRESS}/api/chat" \
  -H 'content-type: application/json' \
  -d '{"message":"Reply with ready.","conversationId":"test-provisioning-service","communicationType":"chat"}'
echo
