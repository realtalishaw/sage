import type {
  ContinuityMode,
  IdempotencyKey,
  InstanceId,
  IsoTimestamp,
  JsonObject,
  JsonValue,
  SandboxPolicy,
  SessionKey,
  TaskId,
  TaskKind,
  TaskPriority,
  TraceId,
  UserId,
} from '@sage/shared-types';

import type { InstanceTaskStatus } from './status';

// Attachment references let the interaction agent give the instance durable
// pointers to prior uploads or artifacts without forcing every request to carry
// raw file bytes. The wrapper can decide how those IDs map to actual storage.
export interface InstanceTaskAttachment {
  id: string;
  kind: 'file' | 'image' | 'url' | 'note';
  label: string;
  mimeType?: string;
  url?: string;
}

// This block carries the actual work request. It should stay human-readable
// because the interaction agent is deliberately translating from natural user
// input into a more executable task for the instance.
export interface InstanceTaskDefinition {
  attachments?: InstanceTaskAttachment[];
  instructions: string;
  kind: TaskKind;
  title: string;
}

// Runtime policy captures the high-level execution guardrails Sage wants.
// These are product-level instructions, not low-level OpenClaw flags.
export interface InstanceTaskRuntimePolicy {
  maxRuntimeSeconds?: number;
  priority: TaskPriority;
  sandbox: SandboxPolicy;
}

// Session continuity is the contract layer that lets Sage keep the interaction
// agent and the OC instance feeling like the same worker over time, while still
// choosing isolated execution when a task should branch from shared history.
export interface InstanceTaskSessionPolicy {
  continuity: ContinuityMode;
  sessionKey: SessionKey;
}

// Context is deliberately optional and high-level. We want enough room to pass
// normalized memory or orchestration hints later without making v1 brittle.
export interface InstanceTaskContext {
  aceAdvice?: string[];
  interactionSummary?: string;
  metadata?: JsonObject;
  userMessage?: string;
}

// This is the public task-ingress contract:
// interaction-agent -> user-instance wrapper.
//
// Important design choice: there is no callback URL here. The instance should
// never accept arbitrary destinations from the request body. The callback target
// is configured out-of-band when the instance is provisioned.
export interface InstanceTaskRequest {
  context?: InstanceTaskContext;
  createdAt: IsoTimestamp;
  idempotencyKey: IdempotencyKey;
  instanceId: InstanceId;
  task: InstanceTaskDefinition;
  taskId: TaskId;
  traceId: TraceId;
  runtime: InstanceTaskRuntimePolicy;
  session: InstanceTaskSessionPolicy;
  userId: UserId;
}

// The wrapper should return immediately after durable acceptance. This keeps
// the ingress simple and allows long-running OC work to finish asynchronously.
export interface InstanceTaskAcceptedResponse {
  acceptedAt: IsoTimestamp;
  idempotencyKey: IdempotencyKey;
  instanceId: InstanceId;
  status: Extract<InstanceTaskStatus, 'accepted'>;
  taskId: TaskId;
  traceId: TraceId;
}

// Internal status lookups reuse the accepted-response identity fields, but the
// status itself must widen beyond "accepted" once the task starts moving.
export interface InstanceTaskStatusResponse extends Omit<InstanceTaskAcceptedResponse, 'status' | 'acceptedAt'> {
  acceptedAt: IsoTimestamp;
  lastUpdatedAt: IsoTimestamp;
  output?: {
    artifactIds?: string[];
    metadata?: JsonObject;
    summary?: string;
  };
  status: InstanceTaskStatus;
}

// Small reusable runtime helpers. We keep them in the contracts package because
// these checks will be needed by SDKs, wrapper routes, and worker tests.
const TASK_KINDS: TaskKind[] = ['general', 'build', 'research', 'operations'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];
const SANDBOX_POLICIES: SandboxPolicy[] = ['required', 'preferred', 'disabled'];
const CONTINUITY_MODES: ContinuityMode[] = ['reuse', 'fork', 'stateless'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

// The guards below are intentionally strict enough to protect external
// boundaries, but light enough to remain framework-agnostic and dependency-free.
export function isInstanceTaskRequest(value: unknown): value is InstanceTaskRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isString(value.createdAt) ||
    !isString(value.idempotencyKey) ||
    !isString(value.instanceId) ||
    !isString(value.taskId) ||
    !isString(value.traceId) ||
    !isString(value.userId)
  ) {
    return false;
  }

  if (!isRecord(value.task) || !isString(value.task.title) || !isString(value.task.instructions)) {
    return false;
  }

  if (!TASK_KINDS.includes(value.task.kind as TaskKind)) {
    return false;
  }

  if (value.task.attachments !== undefined) {
    if (!Array.isArray(value.task.attachments)) {
      return false;
    }

    const attachmentsAreValid = value.task.attachments.every((attachment) => {
      if (!isRecord(attachment)) {
        return false;
      }

      const kind = attachment.kind;

      return (
        isString(attachment.id) &&
        isString(attachment.label) &&
        (kind === 'file' || kind === 'image' || kind === 'url' || kind === 'note') &&
        (attachment.mimeType === undefined || isString(attachment.mimeType)) &&
        (attachment.url === undefined || isString(attachment.url))
      );
    });

    if (!attachmentsAreValid) {
      return false;
    }
  }

  if (!isRecord(value.runtime)) {
    return false;
  }

  if (
    !TASK_PRIORITIES.includes(value.runtime.priority as TaskPriority) ||
    !SANDBOX_POLICIES.includes(value.runtime.sandbox as SandboxPolicy) ||
    (value.runtime.maxRuntimeSeconds !== undefined && typeof value.runtime.maxRuntimeSeconds !== 'number')
  ) {
    return false;
  }

  if (!isRecord(value.session)) {
    return false;
  }

  if (
    !CONTINUITY_MODES.includes(value.session.continuity as ContinuityMode) ||
    !isString(value.session.sessionKey)
  ) {
    return false;
  }

  if (value.context !== undefined) {
    if (!isRecord(value.context)) {
      return false;
    }

    if (value.context.aceAdvice !== undefined && !isStringArray(value.context.aceAdvice)) {
      return false;
    }

    if (value.context.interactionSummary !== undefined && !isString(value.context.interactionSummary)) {
      return false;
    }

    if (value.context.userMessage !== undefined && !isString(value.context.userMessage)) {
      return false;
    }

    if (value.context.metadata !== undefined && !isJsonValue(value.context.metadata)) {
      return false;
    }
  }

  return true;
}
  
