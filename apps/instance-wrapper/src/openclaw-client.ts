import type { InstanceTaskRequest } from '@sage/instance-contracts';

import type { InstanceWrapperConfig } from './config.js';
import type { InMemoryTaskStore } from './store.js';

// This client now supports two modes:
//
// 1. Real mode: forward the task into a localhost OpenClaw gateway using the
//    existing `/hooks/agent` webhook endpoint.
// 2. Simulation mode: keep the old fake lifecycle so wrapper development is not
//    blocked when OpenClaw is not running locally yet.
//
// That split lets us move the architecture forward immediately while preserving
// a simple local dev loop.
export class OpenClawClient {
  constructor(
    private readonly config: InstanceWrapperConfig,
    private readonly store: InMemoryTaskStore,
  ) {}

  dispatchTask(task: InstanceTaskRequest): void {
    void this.dispatch(task);
  }

  private async dispatch(task: InstanceTaskRequest): Promise<void> {
    this.store.updateTask(task.taskId, {
      status: 'queued',
    });

    if (this.config.useRealOpenClawHooks) {
      await this.dispatchToRealOpenClaw(task);
      return;
    }

    await this.simulateDispatch(task);
  }

  private async dispatchToRealOpenClaw(task: InstanceTaskRequest): Promise<void> {
    if (!this.config.openClawHookToken) {
      this.store.updateTask(task.taskId, {
        output: {
          metadata: {
            gatewayBaseUrl: this.config.gatewayBaseUrl,
            realOpenClawAttempted: true,
          },
          summary: 'Wrapper is configured for real OpenClaw hooks, but OC_HOOK_TOKEN is missing.',
        },
        status: 'failed',
      });
      return;
    }

    this.store.updateTask(task.taskId, {
      status: 'running',
    });

    const payload = {
      agentId: this.config.openClawHookAgentId,
      callbackContext: {
        instanceId: task.instanceId,
        taskId: task.taskId,
        traceId: task.traceId,
        userId: task.userId,
      },
      deliver: false,
      message: buildOpenClawMessage(task),
      name: `Sage Task ${task.taskId}`,
      sessionKey: buildOpenClawHookSessionKey(task),
      timeoutSeconds: task.runtime.maxRuntimeSeconds,
      wakeMode: 'now',
    };

    const response = await fetch(new URL(this.config.openClawHookPath, this.config.gatewayBaseUrl), {
      body: JSON.stringify(payload),
      headers: {
        authorization: `Bearer ${this.config.openClawHookToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    const responseText = await response.text();

    if (!response.ok) {
      this.store.updateTask(task.taskId, {
        output: {
          metadata: {
            gatewayBaseUrl: this.config.gatewayBaseUrl,
            openClawResponse: responseText,
            statusCode: response.status,
          },
          summary: 'OpenClaw hook request was rejected.',
        },
        status: 'failed',
      });
      return;
    }

    this.store.updateTask(task.taskId, {
      output: {
        metadata: {
          gatewayBaseUrl: this.config.gatewayBaseUrl,
          openClawResponse: responseText,
          realOpenClawAttempted: true,
        },
        summary: 'Task was forwarded to OpenClaw via /hooks/agent and accepted for asynchronous execution.',
      },
      status: 'running',
    });
  }

  private async simulateDispatch(task: InstanceTaskRequest): Promise<void> {
    await delay(50);

    this.store.updateTask(task.taskId, {
      status: 'running',
    });

    await delay(150);

    this.store.updateTask(task.taskId, {
      output: {
        metadata: {
          gatewayBaseUrl: this.config.gatewayBaseUrl,
          simulated: true,
        },
        summary: `Stub task "${task.task.title}" was accepted by the wrapper and marked complete.`,
      },
      status: 'succeeded',
    });
  }
}

// The wrapper translates Sage's structured task contract into a single
// executable prompt for the current OpenClaw webhook interface. We keep that
// translation explicit so it is easy to replace later if we add a richer OC
// endpoint in the fork.
function buildOpenClawMessage(task: InstanceTaskRequest): string {
  const lines = [
    `Title: ${task.task.title}`,
    `Kind: ${task.task.kind}`,
    `User ID: ${task.userId}`,
    `Trace ID: ${task.traceId}`,
    '',
    'Instructions:',
    task.task.instructions,
  ];

  if (task.context?.interactionSummary) {
    lines.push('', 'Interaction Summary:', task.context.interactionSummary);
  }

  if (task.context?.userMessage) {
    lines.push('', 'Original User Message:', task.context.userMessage);
  }

  if (task.context?.aceAdvice?.length) {
    lines.push('', 'ACE Advice:', ...task.context.aceAdvice.map((entry) => `- ${entry}`));
  }

  if (task.task.attachments?.length) {
    lines.push('', 'Attachments:');
    for (const attachment of task.task.attachments) {
      lines.push(`- [${attachment.kind}] ${attachment.label}${attachment.url ? ` -> ${attachment.url}` : ''}`);
    }
  }

  return lines.join('\n');
}

// OpenClaw's hook ingress is designed to keep caller-chosen session keys behind
// an allowlisted prefix such as `hook:`. We normalize Sage session keys here so
// the wrapper can preserve continuity while still fitting OC's stricter policy.
function buildOpenClawHookSessionKey(task: InstanceTaskRequest): string {
  const original = task.session.sessionKey.trim();

  return original.startsWith('hook:') ? original : `hook:${original}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
