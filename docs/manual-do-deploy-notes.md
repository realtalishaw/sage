# Manual DigitalOcean Deploy Notes

Date:
- March 12, 2026

Scope:
- manual rehearsal for one Sage droplet
- `instance-wrapper` public on droplet IP
- OpenClaw private on the same droplet
- wrapper `api/chat` proxied to OpenClaw `v1/chat/completions`
- Anthropic-backed OpenClaw

Test droplet:
- name: `sage-manual-test-20260312`
- id: `557783787`
- region: `nyc1`
- public ip: `24.144.125.85`

## What worked

- `doctl` auth and droplet creation worked from the local machine.
- copying a private local env file to `/etc/sage/openclaw.env` worked well as the manual secret path.
- the preconfig script at [setup-openclaw-instance-config.sh](/Users/talishawhite/sage/scripts/bootstrap/setup-openclaw-instance-config.sh) correctly wrote:
  - `skipBootstrap: true`
  - `gateway.http.endpoints.chatCompletions.enabled: true`
  - `agents.defaults.model.primary: "anthropic/claude-sonnet-4-5"`
- `instance-wrapper` built successfully on the droplet.
- `instance-wrapper` served correctly through nginx on the droplet IP.
- `GET /api/health` worked publicly through nginx.
- OpenClaw eventually came up and answered on `127.0.0.1:19001`.
- `POST /api/chat` streamed real OpenClaw responses end-to-end through the wrapper.

## What did not work cleanly

- a `s-2vcpu-4gb` droplet was not a good fit for this startup path.
  - OpenClaw `gateway:dev` made the machine sluggish during first startup.
  - short SSH diagnostics frequently timed out while the gateway was compiling/building.
- nginx initially still served the default welcome page.
  - root cause: after writing the new nginx site config, nginx was enabled but not explicitly restarted/reloaded.
  - the later droplet reboot made the correct config take effect.
- early `502` responses from nginx happened while the wrapper/OpenClaw upstreams were still coming up.
- OpenClaw startup via `pnpm gateway:dev` is functional but expensive.
  - it triggers a substantial build path on boot.
  - this is likely not the right final service command for automated provisioning.

## Current known-good manual shape

Secrets:
- local source: `/Users/talishawhite/sage/.secrets/.env`
- droplet target: `/etc/sage/openclaw.env`

Needed env vars:
- `ANTHROPIC_API_KEY`
- `SAGE_OC_GATEWAY_TOKEN`
- `SAGE_OC_HOOK_TOKEN`
- optional: `OC_CHAT_AGENT_ID` (`main` used in this test)

Runtime paths:
- OpenClaw config: `/opt/sage/openclaw/openclaw.json`
- OpenClaw workspace: `/opt/sage/openclaw/workspace`
- wrapper app: `/opt/sage/apps/instance-wrapper`
- fork: `/opt/sage/forks/openclaw`

Network:
- nginx public on `:80`
- wrapper on `127.0.0.1:3000`
- OpenClaw on `127.0.0.1:19001`

## Required process fixes before API automation

- do not use `gateway:dev` as the long-term service command unless we accept slow startup.
- explicitly reload or restart nginx after writing site config.
- standardize service units instead of ad hoc remote shell commands.
- standardize token generation and write both wrapper/OpenClaw runtime envs in one pass.
- optionally seed the OpenClaw workspace with desired project context if the agent should start with repo awareness.

## Automation implications

The manual path confirms the automation model should be:

1. create droplet
2. install system packages, Node, pnpm, nginx
3. upload app/fork payload
4. upload `/etc/sage/openclaw.env`
5. run OpenClaw config writer
6. install dependencies
7. build wrapper
8. write service units
9. write nginx config
10. restart nginx
11. start services
12. health-check:
   - public `/`
   - public `/api/health`
   - internal OpenClaw health/chat
   - public `/api/chat`
