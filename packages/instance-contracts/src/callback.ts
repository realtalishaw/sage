import type {
  InstanceId,
  IsoTimestamp,
  JsonObject,
  TaskId,
  TraceId,
  UserId,
} from '@sage/shared-types';

import type { InstanceTaskEventName, InstanceTaskStatus } from './status';

// Callback payloads are sent from the user instance back to Sage core after the
// task changes state. These are separate from the public ingress contract so the
// central system can evolve its internal processing without exposing that shape
// to external callers.
interface InstanceTaskCallbackBase {
  event: InstanceTaskEventName;
  instanceId: InstanceId;
  occurredAt: IsoTimestamp;
  taskId: TaskId;
  traceId: TraceId;
  userId: UserId;
}

// Success callbacks should carry enough information for the interaction agent to
// explain the outcome to the user without needing to immediately query the
// instance again, while still keeping large artifacts out of the webhook body.
export interface InstanceTaskSucceededCallback extends InstanceTaskCallbackBase {
  event: 'task.succeeded';
  result: {
    artifactIds?: string[];
    metadata?: JsonObject;
    summary: string;
  };
  status: Extract<InstanceTaskStatus, 'succeeded' | 'callback_pending' | 'callback_delivered'>;
}

// Failure callbacks must distinguish between a user-facing summary and more
// operational detail. The interaction agent should usually relay the summary,
// while Sage core can store the detail for debugging and retries.
export interface InstanceTaskFailedCallback extends InstanceTaskCallbackBase {
  error: {
    code: string;
    detail?: string;
    retryable: boolean;
    summary: string;
  };
  event: 'task.failed';
  status: Extract<InstanceTaskStatus, 'failed' | 'callback_pending' | 'callback_delivered'>;
}

// Progress callbacks are optional, but defining them now gives us a stable
// place to report long-running work later without changing the top-level shape.
export interface InstanceTaskProgressCallback extends InstanceTaskCallbackBase {
  event: 'task.progressed';
  progress: {
    message: string;
    percent?: number;
    stage?: string;
  };
  status: Extract<InstanceTaskStatus, 'running'>;
}

export type InstanceTaskCallback =
  | InstanceTaskFailedCallback
  | InstanceTaskProgressCallback
  | InstanceTaskSucceededCallback;
