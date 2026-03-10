

# Monorepo Structure

```text
sage/
  README.md
  pnpm-workspace.yaml
  package.json
  turbo.json
  tsconfig.base.json
  .env.example
  .gitignore

  apps/
    marketing-site/
    messaging-gateway/
    interaction-agent/
    provisioning-service/
    instance-wrapper/
    ops-console/

  packages/
    shared-types/
    instance-contracts/
    messaging-contracts/
    db/
    auth/
    config/
    logger/
    queue/
    cloud/
    google/
    crypto/
    sdk-instance-client/
    sdk-provisioning/
    ui/

  services/
    context-engine/
    background-workers/

  infrastructure/
    cloudflare/
    digitalocean/
    docker/
    bootstrap/
    observability/

  forks/
    openclaw/

  docs/
    architecture/
    contracts/
    runbooks/
    product/

  scripts/
    dev/
    bootstrap/
    release/
```

---

# Top-Level Folders

## `apps/`
These are the deployable applications. If something runs as its own server/app, it usually belongs here.

## `packages/`
These are shared libraries. They should not be standalone products. They exist so multiple apps can share the same logic and types.

## `services/`
These are long-running backend systems that are not really user-facing apps, but also are not just libraries.

## `infrastructure/`
This holds infra definitions, templates, and bootstrap assets. Think “how the system is deployed and operated”.

## `forks/`
This is where your OpenClaw fork lives. Keeping it isolated here makes it easier to reason about what is product code vs what is forked upstream code.

## `docs/`
Architecture, contracts, operational docs, and product decisions. This repo will get complicated fast; docs are not optional.

## `scripts/`
Utility scripts for local dev, setup, release, and bootstrap.

---

# `apps/` Breakdown

## `apps/marketing-site/`
Purpose:
- `joinsage.xyz`
- landing page
- pricing
- signup CTA
- docs/help links
- brand site only

What belongs here:
- static pages
- lightweight web app code
- analytics
- marketing copy
- trial/signup entry points

What does not belong here:
- provisioning logic
- interaction agent logic
- instance APIs
- OpenClaw integration

---

## `apps/messaging-gateway/`
Purpose:
- all inbound/outbound phone line handling
- load balancing across lines
- provider webhook ingestion
- routing messages to the interaction agent
- enforcing capacity limits

What belongs here:
- SMS/iMessage provider webhooks
- line state management
- quota counters
- sharding logic
- outbound send logic
- conversation-to-line assignment

Key concepts this app owns:
- “Which line should this message use?”
- “Is line A too full?”
- “Should this new user be assigned to line B?”
- “How do we keep a user pinned to the same line?”

This app is your telecom/router layer.

---

## `apps/interaction-agent/`
Purpose:
- the orchestrator users are really “talking to”
- decides whether to answer directly or delegate to the user’s OC instance

What belongs here:
- prompt orchestration
- user lookup
- memory/context retrieval
- task delegation to instance wrapper
- callback receipt from OC instances
- response rewriting for end users

This app owns the logic:
- “Can I answer this myself?”
- “Should I send this to the user’s OpenClaw instance?”
- “How should I phrase the result back to the user?”

This is the product brain.

---

## `apps/provisioning-service/`
Purpose:
- creates and configures user infrastructure

What belongs here:
- Stripe webhook handlers
- DigitalOcean droplet creation
- bootstrap job dispatch
- Cloudflare DNS record creation
- Google Workspace provisioning
- instance metadata persistence

This app owns:
- “A user paid. Make their world exist.”

It should not contain:
- agent prompting
- dashboard logic
- public user UI

This is your infrastructure control plane.

---

## `apps/instance-wrapper/`
Purpose:
- the public face of each user instance at `yourinstance.joinsage.app`
- sits in front of OpenClaw
- handles auth, task ingress, dashboard, and file browsing

What belongs here:
- login page
- authenticated dashboard
- `POST /api/tasks` async ingress
- internal calls to localhost OpenClaw
- file browser
- task history/status
- logs/status views

This app is what the browser talks to.
OpenClaw should be behind it, not exposed directly.

This app owns:
- “user-facing control panel for one user’s private worker instance”

---

## `apps/ops-console/`
Purpose:
- internal admin console for you and your team

What belongs here:
- user search
- instance status
- line capacity monitoring
- provisioning status
- callback failures
- manual retry tools
- billing/admin ops

This is not customer-facing.

---

# `packages/` Breakdown

## `packages/shared-types/`
Purpose:
- common types used everywhere

What belongs here:
- user IDs
- instance IDs
- task IDs
- enums
- basic domain models
- status types

This is your foundation package.

---

## `packages/instance-contracts/`
Purpose:
- exact contracts between interaction-agent, instance-wrapper, and OC callbacks

What belongs here:
- task request payload
- accepted response payload
- callback payload
- signing header definitions
- validation schemas

This package is extremely important.
It is the truth for “how one system talks to a user instance”.

---

## `packages/messaging-contracts/`
Purpose:
- exact contracts around inbound/outbound messaging

What belongs here:
- normalized message payloads
- line assignment events
- provider webhook payload adapters
- outbound message result structures

This keeps messaging logic from becoming provider-specific spaghetti.

---

## `packages/db/`
Purpose:
- DB schema and access layer

What belongs here:
- schema definitions
- migrations
- repositories/queries
- connection management
- typed DB helpers

Every app that touches data will likely depend on this.

---

## `packages/auth/`
Purpose:
- shared auth/session logic

What belongs here:
- dashboard auth helpers
- token/session validation
- user auth models
- middleware helpers

This is mostly for your wrapper app and internal admin tools.

---

## `packages/config/`
Purpose:
- environment/config loading for all apps

What belongs here:
- env validation
- typed config objects
- app config loaders
- shared defaults

Every app should use one config pattern, not invent its own.

---

## `packages/logger/`
Purpose:
- shared logging setup

What belongs here:
- logger factory
- request logging
- trace IDs
- structured log helpers

This matters because you have many services and callbacks.

---

## `packages/queue/`
Purpose:
- async job/event abstractions

What belongs here:
- enqueue helpers
- worker job types
- retry policy helpers
- background task contracts

Useful for provisioning jobs, callback retries, context ingestion, and line balancing events.

---

## `packages/cloud/`
Purpose:
- cloud provider helpers

What belongs here:
- generic cloud abstractions if you want them
- instance state helpers
- origin metadata helpers

Optional at first, but useful.

---

## `packages/google/`
Purpose:
- Google Workspace integration helpers

What belongs here:
- workspace provisioning client
- email/account setup helpers
- Google API wrappers

Keep Google-specific logic out of the provisioning app itself.

---

## `packages/crypto/`
Purpose:
- webhook signing and verification

What belongs here:
- HMAC signing
- request verification
- timestamp validation
- replay-prevention helpers

This should be reused by:
- messaging ingress
- instance task ingress
- callback verification
- Stripe/webhook handling patterns

---

## `packages/sdk-instance-client/`
Purpose:
- typed client for talking to a user instance

What belongs here:
- functions like `sendTaskToInstance()`
- request signing
- retries
- callback correlation helpers

Used by the interaction-agent.

---

## `packages/sdk-provisioning/`
Purpose:
- typed client/helpers for provisioning flows

What belongs here:
- droplet request builders
- DNS record builders
- bootstrap request models

Helps keep the provisioning service clean.

---

## `packages/ui/`
Purpose:
- shared frontend components

What belongs here:
- shared dashboard UI components
- auth screens
- file browser pieces
- design system tokens

This is mostly for:
- instance wrapper dashboard
- ops console
- maybe marketing shared elements

---

# `services/` Breakdown

## `services/context-engine/`
Purpose:
- your “data lake of context”
- ingests events and turns them into memory

What belongs here:
- transcript ingestion
- event normalization
- memory synthesis
- pattern extraction
- ACE playbook generation later

This should be its own service because it will grow into a large subsystem.

---

## `services/background-workers/`
Purpose:
- async jobs that do not belong inside web apps

What belongs here:
- provisioning retries
- callback retries
- stale instance reconciliation
- line usage rollups
- memory compaction/indexing jobs

This is your general async execution layer.

---

# `infrastructure/` Breakdown

## `infrastructure/cloudflare/`
Purpose:
- Cloudflare-related infra templates and docs

What belongs here:
- DNS automation helpers
- edge security configs
- WAF/rules reference
- tunnel/origin notes if needed

---

## `infrastructure/digitalocean/`
Purpose:
- DigitalOcean provisioning assets

What belongs here:
- cloud-init templates
- droplet setup templates
- firewall assumptions
- volume/network notes

---

## `infrastructure/docker/`
Purpose:
- local/dev/prod container setup

What belongs here:
- compose files
- Dockerfiles
- local integration test stacks

---

## `infrastructure/bootstrap/`
Purpose:
- scripts/templates used when a new user droplet is born

What belongs here:
- bootstrap scripts
- install order
- config-file templates
- systemd unit templates
- wrapper/OC startup scripts

This folder is central to provisioning.

---

## `infrastructure/observability/`
Purpose:
- logs, metrics, tracing, alerting setup

What belongs here:
- dashboards
- alert rules
- tracing config
- log shipping notes

---

# `forks/openclaw/`
Purpose:
- your customized OpenClaw fork

What belongs here:
- upstream OpenClaw code
- your changes:
  - callback support
  - ACE playbook integration
  - context-engine emitters
  - your opinionated runtime defaults

Why keep it isolated:
- easier upstream sync
- easier to know what is “product code” vs “fork code”
- fewer accidental cross-dependencies

---

# `docs/` Breakdown

## `docs/architecture/`
Purpose:
- system architecture docs

What belongs here:
- high-level system diagrams
- droplet layout
- data flow docs
- line-balancer architecture
- instance lifecycle

---

## `docs/contracts/`
Purpose:
- request/response/callback contracts

What belongs here:
- task ingress contract
- callback contract
- provisioning event contract
- messaging event contract

These should mirror `packages/instance-contracts` and `packages/messaging-contracts`.

---

## `docs/runbooks/`
Purpose:
- operational procedures

What belongs here:
- how to debug a droplet
- how to reprovision a user
- how to rotate secrets
- how to handle failed callbacks
- how to inspect OpenClaw locally

---

## `docs/product/`
Purpose:
- product behavior and business logic docs

What belongs here:
- signup flow
- onboarding rules
- trial behavior
- line-capacity policy
- user-facing lifecycle

---

# `scripts/` Breakdown

## `scripts/dev/`
Purpose:
- local development convenience

What belongs here:
- run all services locally
- seed dev DB
- create local test instance

---

## `scripts/bootstrap/`
Purpose:
- machine bootstrap commands

What belongs here:
- scripts used in cloud-init or droplet startup
- install wrapper app
- install OpenClaw
- write config/secrets
- start services

---

## `scripts/release/`
Purpose:
- release/version workflows

What belongs here:
- package build/release helpers
- fork sync helpers
- deployment release scripts

