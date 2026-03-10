# OpenClaw Dev Baseline

This is the shortest path to get Sage talking to a real OpenClaw process
locally.

If you think in Python terms, this is the equivalent of:

1. create the config file
2. run the worker service
3. run the web app that calls the worker
4. send one request through the whole stack

## What we are setting up

There are two separate processes:

- OpenClaw: the private worker engine
- instance-wrapper: the Sage app that sits in front of OpenClaw

For local development, the flow is:

1. wrapper accepts `POST /api/tasks`
2. wrapper forwards to OpenClaw `POST /hooks/agent`
3. OpenClaw accepts the async run
4. wrapper shows the task as running

Important:

- this does **not** include completion callbacks yet
- this does **not** include the dashboard yet
- this does **not** include provisioning yet

It only proves the first real integration boundary.

## One-time setup

Write the minimal OpenClaw dev config:

```bash
./scripts/dev/setup-openclaw-dev-config.sh
```

By default that writes:

- config: `~/.openclaw-dev/openclaw.json`
- workspace: `~/.openclaw-dev/workspace`
- gateway port: `19001`
- hooks path: `/hooks`

If you want to test completion callbacks too, first choose a local callback URL:

```bash
export SAGE_OC_CALLBACK_URL=http://127.0.0.1:4010/api/oc-callback
export SAGE_OC_CALLBACK_TOKEN=sage-callback-token
./scripts/dev/setup-openclaw-dev-config.sh
```

## Model credentials

The generated config points OpenClaw at:

- model: `openai/gpt-5.2-mini`

So before asking OpenClaw to actually execute work, export a valid provider key:

```bash
export OPENAI_API_KEY=your-real-key
```

Without model credentials, the gateway can still start, but real task execution
will fail later when OpenClaw tries to call the model.

## Start OpenClaw

In one terminal:

```bash
./scripts/dev/run-openclaw-dev.sh
```

This runs your fork in the dev profile and uses the config written above.

## Start the wrapper in real OpenClaw mode

In a second terminal:

```bash
OC_USE_REAL_HOOKS=1 \
OC_GATEWAY_BASE_URL=http://127.0.0.1:19001 \
OC_HOOK_TOKEN=sage-dev-hook-token \
./scripts/dev/run-instance-wrapper.sh
```

## Send a test task through Sage

In a third terminal:

```bash
./scripts/dev/test-instance-wrapper.sh
```

## Optional: watch callback webhooks arrive

If you set `SAGE_OC_CALLBACK_URL` above, start this local receiver in another
terminal before running OpenClaw:

```bash
SAGE_CALLBACK_TOKEN=sage-callback-token \
./scripts/dev/run-sage-callback-receiver.py
```

When OpenClaw finishes a hook-triggered run, the receiver prints the callback
payload to the terminal.

## What success looks like

You should see:

1. OpenClaw starts successfully on the dev profile
2. wrapper health shows `openClawHooksMode: "real"`
3. `POST /api/tasks` returns `202 Accepted`
4. wrapper status shows the task as `running`
5. if callback mode is enabled, the callback receiver prints a `task.succeeded`
   or `task.failed` payload

Why `running` and not `succeeded`?

Because the wrapper now forwards to real OpenClaw, but OpenClaw does not yet
call Sage back with a completion webhook. That callback contract is the next
fork-level feature.

## What the generated OpenClaw config does

The script writes a small config with these key behaviors:

- `gateway.mode: "local"`
- `gateway.bind: "loopback"`
- `gateway.port: 19001`
- `gateway.auth.mode: "token"`
- `hooks.enabled: true`
- `hooks.token: "sage-dev-hook-token"`
- `hooks.allowRequestSessionKey: true`
- `hooks.allowedSessionKeyPrefixes: ["hook:"]`
- `agents.defaults.workspace: ~/.openclaw-dev/workspace`
- `tools.profile: "coding"`
- `tools.deny: ["browser", "canvas"]`

## Why the hook session key starts with `hook:`

OpenClaw's hook ingress is designed to restrict caller-provided session keys.
The wrapper now prefixes forwarded session keys with `hook:` so they fit the
allowlist configured above.

## What the next step is after this works

Once this baseline works end to end, the next Sage-side change should be:

- replace the dev callback receiver with a real callback endpoint in the
  interaction-agent or central control-plane service

That is what turns "the callback printed in a terminal" into "Sage can update
task state and answer the user."
