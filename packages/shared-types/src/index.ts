// Shared domain types used across Sage packages.
//
// This package intentionally stays small and boring. It should only contain
// primitives and lightweight models that are truly shared by multiple apps.
// Anything specific to one transport boundary belongs in a contracts package.

// IDs are plain strings at runtime because they will be serialized over HTTP,
// stored in databases, and passed through queues. We still give them distinct
// type aliases so TypeScript can communicate intent at call sites.
export type UserId = string;
export type InstanceId = string;
export type TaskId = string;
export type SessionKey = string;
export type TraceId = string;
export type IdempotencyKey = string;
export type SecretKeyId = string;

// Timestamps move between systems as ISO 8601 strings rather than Date objects.
// This avoids timezone ambiguity and keeps JSON payloads deterministic.
export type IsoTimestamp = string;

// URLs are also represented as strings because the WHATWG URL class does not
// serialize cleanly in plain JSON contracts.
export type UrlString = string;

// Small helper for arbitrary metadata that should remain JSON-safe. Keeping this
// centralized prevents each package from re-declaring its own JSON value union.
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

// Priority helps the wrapper and background workers decide how aggressively a
// task should be queued and surfaced, without changing the task semantics.
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// Execution kind is a coarse routing hint. It lets Sage send the task to the
// right OC workflow without exposing low-level tool details to the caller.
export type TaskKind = 'general' | 'build' | 'research' | 'operations';

// Sandbox policy captures how strongly the caller expects filesystem / runtime
// isolation. The actual implementation can evolve later without changing this
// public contract.
export type SandboxPolicy = 'required' | 'preferred' | 'disabled';

// Agent continuity is important for Sage because the interaction agent and the
// OC instance should feel like one persistent worker over time.
export type ContinuityMode = 'reuse' | 'fork' | 'stateless';

// Common lifecycle states reused by status endpoints, queue workers, and
// callbacks. The instance-contracts package narrows these into task-specific
// unions where needed.
export type LifecycleState =
  | 'accepted'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';
