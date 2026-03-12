# OpenClaw Instance Deploy

This is the current prototype deployment shape for one Sage instance:

- `instance-wrapper` is the public web app on the droplet IP or domain
- OpenClaw runs on the same droplet, loopback-only
- the wrapper proxies basic chat requests to OpenClaw
- OpenClaw is preconfigured and does not rely on interactive onboarding

## Runtime layout

- public app: `http://<droplet-ip>/`
- wrapper API: `http://<droplet-ip>/api/*`
- OpenClaw gateway: `http://127.0.0.1:19001`
- OpenClaw chat: `http://127.0.0.1:19001/v1/chat/completions`

OpenClaw should stay on loopback only. The browser should only talk to
`instance-wrapper`.

## 1. Write the OpenClaw instance config

```bash
cd /opt/sage
export SAGE_OC_GATEWAY_TOKEN=replace-with-real-token
export SAGE_OC_HOOK_TOKEN=replace-with-real-hook-token
export ANTHROPIC_API_KEY=replace-with-real-model-key
./scripts/bootstrap/setup-openclaw-instance-config.sh
```

That script writes a config with:

- `agents.defaults.skipBootstrap: true`
- `agents.defaults.model.primary: "anthropic/claude-sonnet-4-5"`
- `gateway.bind: "loopback"`
- `gateway.http.endpoints.chatCompletions.enabled: true`
- `hooks.enabled: true`

The OpenClaw config itself is meant to stay prewritten. Do not put the
Anthropic key in `openclaw.json`. Keep the secret in the process environment on
the droplet and let OpenClaw resolve `ANTHROPIC_API_KEY` at runtime.

The clean place to put it is your service environment file, for example:

```bash
sudo tee /etc/sage/openclaw.env >/dev/null <<'EOF'
ANTHROPIC_API_KEY=sk-ant-...
SAGE_OC_GATEWAY_TOKEN=replace-with-real-token
SAGE_OC_HOOK_TOKEN=replace-with-real-hook-token
EOF
```

Then load that env file from whatever starts OpenClaw and the wrapper
(`systemd`, `supervisord`, or a shell wrapper).

## 2. Start OpenClaw

```bash
cd /opt/sage/forks/openclaw
OPENCLAW_PROFILE=dev \
OPENCLAW_STATE_DIR=/opt/sage/openclaw \
OPENCLAW_CONFIG_PATH=/opt/sage/openclaw/openclaw.json \
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
pnpm gateway:dev
```

## 3. Build and start the wrapper

```bash
cd /opt/sage
pnpm --filter @sage/instance-wrapper build

INSTANCE_WRAPPER_HOST=0.0.0.0 \
INSTANCE_WRAPPER_PORT=3000 \
OC_GATEWAY_BASE_URL=http://127.0.0.1:19001 \
OC_GATEWAY_TOKEN=$SAGE_OC_GATEWAY_TOKEN \
OC_CHAT_AGENT_ID=main \
pnpm --filter @sage/instance-wrapper start
```

## 4. Expose only the wrapper

Use nginx or Caddy in front if you want TLS and a cleaner public port. The only
upstream that should be public is `instance-wrapper`.

Example nginx upstream target:

- `http://127.0.0.1:3000`

Do not publish `19001` directly.

## Current scope

This prototype currently supports:

- browser login UI
- home workstream chat
- wrapper `POST /api/chat`
- OpenClaw-backed responses via `/v1/chat/completions`

This prototype does not yet include:

- real auth
- real persistence outside the local mocked wrapper state
- callback-driven task lifecycle
- background task orchestration
