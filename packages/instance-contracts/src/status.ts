import type { InstanceId, IsoTimestamp, LifecycleState, TaskId } from '@sage/shared-types';

// Task statuses are intentionally fine-grained enough for the dashboard and
// callback pipeline, but still stable enough to store in a database column.
export type InstanceTaskStatus =
  | Extract<LifecycleState, 'accepted' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'>
  | 'callback_pending'
  | 'callback_delivered'
  | 'callback_failed';

// Event names capture important state transitions. These are what background
// workers or webhook consumers should key off of, rather than scraping status
// strings and guessing what changed.
export type InstanceTaskEventName =
  | 'task.accepted'
  | 'task.queued'
  | 'task.started'
  | 'task.progressed'
  | 'task.succeeded'
  | 'task.failed'
  | 'task.cancelled'
  | 'task.callback_pending'
  | 'task.callback_delivered'
  | 'task.callback_failed';

// This is the shape returned by a status endpoint or persisted in task history.
// It is intentionally transport-safe and contains only fields another service
// can rely on without reading OpenClaw internals.
export interface InstanceTaskStatusSnapshot {
  createdAt: IsoTimestamp;
  instanceId: InstanceId;
  lastUpdatedAt: IsoTimestamp;
  status: InstanceTaskStatus;
  taskId: TaskId;
}

// A lightweight envelope for streaming status/event updates through queues,
// webhooks, or audit logs.
export interface InstanceTaskEvent {
  event: InstanceTaskEventName;
  occurredAt: IsoTimestamp;
  snapshot: InstanceTaskStatusSnapshot;
}
