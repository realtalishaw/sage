#!/usr/bin/env bash

set -euo pipefail

SAGE_ROOT="${SAGE_ROOT:-/opt/sage}"
ENV_FILE="${SAGE_ENV_FILE:-/etc/sage/openclaw.env}"
BOOTSTRAP_DIR="${SAGE_ROOT}/infrastructure/bootstrap"

export DEBIAN_FRONTEND=noninteractive

wait_for_apt() {
  while pgrep -x apt >/dev/null 2>&1 || pgrep -x apt-get >/dev/null 2>&1 || pgrep -x dpkg >/dev/null 2>&1; do
    sleep 5
  done
}

wait_for_apt
apt-get update
wait_for_apt
apt-get install -y curl git build-essential nginx ca-certificates

if ! command -v node >/dev/null 2>&1; then
  wait_for_apt
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  wait_for_apt
  apt-get install -y nodejs
fi

corepack enable

mkdir -p /etc/sage /var/log/sage "${SAGE_ROOT}"

chmod 600 "${ENV_FILE}"

set -a
. "${ENV_FILE}"
set +a

"${SAGE_ROOT}/scripts/bootstrap/setup-openclaw-instance-config.sh"

cd "${SAGE_ROOT}/apps/instance-wrapper"
pnpm install
pnpm build

cd "${SAGE_ROOT}/forks/openclaw"
pnpm install

sed \
  -e "s|__SAGE_ROOT__|${SAGE_ROOT}|g" \
  -e "s|__ENV_FILE__|${ENV_FILE}|g" \
  "${BOOTSTRAP_DIR}/sage-openclaw.service" > /etc/systemd/system/sage-openclaw.service

sed \
  -e "s|__SAGE_ROOT__|${SAGE_ROOT}|g" \
  -e "s|__ENV_FILE__|${ENV_FILE}|g" \
  "${BOOTSTRAP_DIR}/sage-wrapper.service" > /etc/systemd/system/sage-wrapper.service

cp "${BOOTSTRAP_DIR}/sage-instance-wrapper.nginx.conf" /etc/nginx/sites-available/sage-instance-wrapper
ln -sf /etc/nginx/sites-available/sage-instance-wrapper /etc/nginx/sites-enabled/sage-instance-wrapper
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable sage-openclaw.service sage-wrapper.service nginx
systemctl restart sage-openclaw.service
systemctl restart sage-wrapper.service
systemctl restart nginx
