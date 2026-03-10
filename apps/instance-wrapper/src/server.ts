import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import {
  INSTANCE_RESPONSE_HEADERS,
  isInstanceTaskRequest,
  type InstanceTaskRequest,
} from '@sage/instance-contracts';

import type { InstanceWrapperConfig } from './config.js';
import { readJsonBody, sendJson, sendText } from './http.js';
import { OpenClawClient } from './openclaw-client.js';
import { verifySignedRequest } from './signing.js';
import { InMemoryTaskStore } from './store.js';

// The server wires together the three baseline routes for the wrapper:
// health, async task ingress, and task status lookup.
export function createInstanceWrapperServer(config: InstanceWrapperConfig) {
  const store = new InMemoryTaskStore();
  const openClawClient = new OpenClawClient(config, store);

  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, config, store, openClawClient);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error';
      sendJson(response, 500, { error: message });
    }
  });
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: InstanceWrapperConfig,
  store: InMemoryTaskStore,
  openClawClient: OpenClawClient,
): Promise<void> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (method === 'GET' && url.pathname === '/') {
    sendText(response, 200, 'Sage instance wrapper is running.');
    return;
  }

  if (method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, {
      instanceId: config.instanceId,
      listenHost: config.listenHost,
      listenPort: config.listenPort,
      ok: true,
      openClawHooksMode: config.useRealOpenClawHooks ? 'real' : 'simulated',
      openClawBaseUrl: config.gatewayBaseUrl,
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/tasks') {
    await handleCreateTask(request, response, config, store, openClawClient);
    return;
  }

  if (method === 'GET' && url.pathname.startsWith('/api/tasks/')) {
    handleGetTask(url.pathname, response, store);
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

async function handleCreateTask(
  request: IncomingMessage,
  response: ServerResponse,
  config: InstanceWrapperConfig,
  store: InMemoryTaskStore,
  openClawClient: OpenClawClient,
): Promise<void> {
  const body = await readJsonBody(request);
  const rawBody = JSON.stringify(body ?? {});

  verifySignedRequest(request.headers, rawBody, config);

  if (!isInstanceTaskRequest(body)) {
    sendJson(response, 400, { error: 'Invalid task payload' });
    return;
  }

  if (body.instanceId !== config.instanceId) {
    sendJson(response, 409, { error: 'Task instance does not match this wrapper' });
    return;
  }

  const accepted = store.createAcceptedTask(body as InstanceTaskRequest);

  response.setHeader(INSTANCE_RESPONSE_HEADERS.statusUrl, `/api/tasks/${accepted.taskId}`);
  sendJson(response, 202, accepted);

  openClawClient.dispatchTask(body as InstanceTaskRequest);
}

function handleGetTask(pathname: string, response: ServerResponse, store: InMemoryTaskStore): void {
  const taskId = pathname.replace('/api/tasks/', '');
  const task = store.getTask(taskId);

  if (!task) {
    sendJson(response, 404, { error: 'Task not found' });
    return;
  }

  sendJson(response, 200, task);
}
