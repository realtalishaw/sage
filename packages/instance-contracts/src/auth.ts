import type { IdempotencyKey, InstanceId, IsoTimestamp, SecretKeyId, TaskId, TraceId } from '@sage/shared-types';

// These constants define the on-the-wire header contract between Sage systems.
// Centralizing them here prevents accidental drift between the interaction
// agent, instance wrapper, callback sender, and any future SDKs.
export const INSTANCE_CONTRACT_VERSION = '2026-03-09';
export const INSTANCE_CONTRACT_CONTENT_TYPE = 'application/json';

// All externally signed requests should carry the same core headers so a single
// verifier can validate inbound task requests and outbound callbacks.
export const INSTANCE_SIGNATURE_HEADERS = {
  contractVersion: 'x-sage-contract-version',
  keyId: 'x-sage-key-id',
  signature: 'x-sage-signature',
  timestamp: 'x-sage-timestamp',
  traceId: 'x-sage-trace-id',
  instanceId: 'x-sage-instance-id',
  taskId: 'x-sage-task-id',
  idempotencyKey: 'x-sage-idempotency-key',
} as const;

// The instance wrapper returns a location header so the caller can poll the
// task status endpoint without keeping a long-lived connection open.
export const INSTANCE_RESPONSE_HEADERS = {
  statusUrl: 'x-sage-task-status-url',
} as const;

// This is the normalized header shape after a web framework lowercases and
// parses incoming headers. The values remain strings because HTTP headers are
// inherently string-based.
export interface SignedContractHeaders {
  [INSTANCE_SIGNATURE_HEADERS.contractVersion]: string;
  [INSTANCE_SIGNATURE_HEADERS.keyId]: SecretKeyId;
  [INSTANCE_SIGNATURE_HEADERS.signature]: string;
  [INSTANCE_SIGNATURE_HEADERS.timestamp]: IsoTimestamp;
  [INSTANCE_SIGNATURE_HEADERS.traceId]: TraceId;
  [INSTANCE_SIGNATURE_HEADERS.instanceId]: InstanceId;
  [INSTANCE_SIGNATURE_HEADERS.taskId]: TaskId;
  [INSTANCE_SIGNATURE_HEADERS.idempotencyKey]: IdempotencyKey;
}

// The callback sender and task submitter both use the same HMAC-style framing,
// but we keep semantic aliases so call sites stay readable.
export type InstanceTaskRequestHeaders = SignedContractHeaders;
export type InstanceCallbackHeaders = SignedContractHeaders;

// A tiny helper type for passing the minimal identity required to construct the
// standard header set from application code.
export interface SignedRequestIdentity {
  idempotencyKey: IdempotencyKey;
  instanceId: InstanceId;
  keyId: SecretKeyId;
  taskId: TaskId;
  timestamp: IsoTimestamp;
  traceId: TraceId;
}
