# Instance Wrapper

This app is the per-user web/API layer that sits in front of a private OpenClaw
instance.

If you are a Python person, treat this exactly like a small Flask or FastAPI app:

- it starts an HTTP server
- it listens on a port
- it has a few routes
- each route handles one request and returns one response

The only difference is that this one is written with Node's built-in HTTP server
instead of Flask/FastAPI.

## What exists right now

This is a baseline backend skeleton, not the full product UI yet.

It currently supports:

- `GET /`
- `GET /api/health`
- `POST /api/tasks`
- `GET /api/tasks/:taskId`

## What the routes do

### `GET /`

Small sanity check route.

You hit it in the browser or with `curl` and it tells you the wrapper process is
alive.

### `GET /api/health`

Returns basic process configuration:

- instance id
- host
- port
- the private OpenClaw base URL the wrapper would talk to

This is the simplest "is the wrapper up?" check.

### `POST /api/tasks`

This is the important one.

It accepts a task from the interaction-agent, validates the signed headers,
checks that the JSON payload matches the contract, stores the task, and
immediately returns `202 Accepted`.

That immediate response is important because the real work may take minutes or
hours.

So in product terms:

1. Sage sends work to the user instance.
2. The wrapper says "I accepted it."
3. The real work continues in the background.

### `GET /api/tasks/:taskId`

This is the polling endpoint.

If the caller wants to know what happened to the task, it asks this route using
the task id.

By default the wrapper simulates OpenClaw and marks the task complete a moment
later so you can see the lifecycle end to end.

If you enable real OpenClaw hook mode, the wrapper instead forwards tasks to the
existing OpenClaw `POST /hooks/agent` endpoint on localhost.

## What is "the server"?

The server is just the running wrapper app.

If you think in Python:

- `createInstanceWrapperServer(...)` in `src/server.ts` is like creating a Flask app
- `server.listen(...)` in `src/index.ts` is like `app.run(...)`
- the route checks inside `src/server.ts` are like Flask route handlers

So when we say "start the server", all we mean is "run the wrapper app so it can
accept HTTP requests".

## Current file layout

- `src/index.ts`: starts the process
- `src/server.ts`: routing and request handling
- `src/config.ts`: environment variables / runtime config
- `src/signing.ts`: request signature verification
- `src/store.ts`: temporary in-memory task storage
- `src/openclaw-client.ts`: temporary fake OpenClaw client

## Important current limitation

The wrapper supports two modes:

- simulated mode: no OpenClaw required, fake lifecycle for local understanding
- real mode: forwards work to OpenClaw `POST /hooks/agent`

Simulated mode is still the default because it keeps local development simple.

## How to run it locally

Open one terminal and start the wrapper:

```bash
./scripts/dev/run-instance-wrapper.sh
```

Open a second terminal and run the smoke test:

```bash
./scripts/dev/test-instance-wrapper.sh
```

That test script will:

1. call `/api/health`
2. create a signed task request
3. send it to `POST /api/tasks`
4. wait briefly
5. fetch `GET /api/tasks/task-123`

## How to run it against real OpenClaw later

The next baseline integration path is to run your OpenClaw fork in dev gateway
mode and point the wrapper at its existing hooks endpoint.

At a high level:

1. Run OpenClaw locally on loopback.
2. Enable hooks with a token in OpenClaw config.
3. Start the wrapper with:
   - `OC_USE_REAL_HOOKS=1`
   - `OC_GATEWAY_BASE_URL=http://127.0.0.1:18789`
   - `OC_HOOK_TOKEN=<your hook token>`
4. Call `POST /api/tasks` on the wrapper.
5. The wrapper forwards the task to `POST /hooks/agent`.

Important: in real mode the wrapper currently only knows that OpenClaw accepted
the asynchronous run. It does not yet receive completion callbacks back from OC.

## What success looks like

You should see:

- a health response
- a `202 Accepted` response for the task
- a later task status showing `succeeded`

## How to think about this step

This step is backend plumbing.

We are proving:

- one user instance can expose a safe public API
- the API contract is real
- signed requests work
- async task acceptance works
- polling works

We are **not** yet proving:

- real dashboard UI
- real login
- real file browsing
- real OpenClaw execution
- real callback webhooks
