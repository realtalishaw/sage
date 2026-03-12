#!/usr/bin/env bash

set -euo pipefail

API_URL="${PROVISIONING_API_URL:-http://127.0.0.1:4010}"
INSTANCE_NAME="${INSTANCE_NAME:-sage-destroy-test-$(date +%Y%m%d-%H%M%S)}"
SSH_KEY_REF="${SSH_KEY_REF:-sage-manual-deploy}"

SSH_KEY_ID="$(doctl compute ssh-key list --format ID,Name --no-header | awk -v ref="${SSH_KEY_REF}" '$2 == ref { print $1; exit }')"

if [ -z "${SSH_KEY_ID}" ]; then
  echo "Could not resolve SSH key id for ${SSH_KEY_REF}." >&2
  exit 1
fi

echo
echo "1. Create disposable droplet"
CREATE_RESPONSE="$(doctl compute droplet create "${INSTANCE_NAME}" --region nyc1 --size s-1vcpu-1gb --image ubuntu-24-04-x64 --ssh-keys "${SSH_KEY_ID}" --wait --output json)"
echo "${CREATE_RESPONSE}"

INSTANCE_ID="$(CREATE_JSON="${CREATE_RESPONSE}" node --input-type=module -e "const payload = JSON.parse(process.env.CREATE_JSON ?? '[]'); process.stdout.write(String(payload[0]?.id ?? ''))")"

if [ -z "${INSTANCE_ID}" ]; then
  echo "Failed to extract disposable droplet id." >&2
  exit 1
fi

echo
echo "2. Destroy through provisioning API"
DELETE_RESPONSE="$(curl -s -X DELETE "${API_URL}/instances/${INSTANCE_ID}")"
echo "${DELETE_RESPONSE}"

echo
echo "3. Verify droplet is gone"
for _ in $(seq 1 12); do
  if ! doctl compute droplet list --format ID,Name --no-header | grep -q "${INSTANCE_NAME}"; then
    echo "destroy verified"
    exit 0
  fi

  sleep 5
done

echo "Droplet still exists after delete." >&2
exit 1
