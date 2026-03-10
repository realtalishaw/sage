import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

import {
  INSTANCE_CONTRACT_VERSION,
  INSTANCE_SIGNATURE_HEADERS,
  type SignedContractHeaders,
  type SignedRequestIdentity,
} from '@sage/instance-contracts';

import type { InstanceWrapperConfig } from './config.js';

// This verifier is intentionally minimal but real. It gives us a stable,
// testable signed boundary between Sage core and the user-instance wrapper
// before we bring in any heavier auth or session machinery.

function getRequiredHeader(headers: IncomingHttpHeaders, key: string): string | undefined {
  const value = headers[key];

  return Array.isArray(value) ? value[0] : value;
}

function buildCanonicalPayload(identity: SignedRequestIdentity, rawBody: string): string {
  return [
    INSTANCE_CONTRACT_VERSION,
    identity.timestamp,
    identity.traceId,
    identity.instanceId,
    identity.taskId,
    identity.idempotencyKey,
    rawBody,
  ].join('\n');
}

function signCanonicalPayload(secret: string, canonicalPayload: string): string {
  return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}

export interface VerifiedRequest {
  headers: SignedContractHeaders;
  rawBody: string;
}

// The wrapper rejects requests with missing or mismatched signature headers.
// That keeps the public task endpoint opinionated from day one.
export function verifySignedRequest(
  headers: IncomingHttpHeaders,
  rawBody: string,
  config: InstanceWrapperConfig,
): VerifiedRequest {
  const contractVersion = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.contractVersion);
  const keyId = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.keyId);
  const signature = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.signature);
  const timestamp = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.timestamp);
  const traceId = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.traceId);
  const instanceId = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.instanceId);
  const taskId = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.taskId);
  const idempotencyKey = getRequiredHeader(headers, INSTANCE_SIGNATURE_HEADERS.idempotencyKey);

  if (
    !contractVersion ||
    !keyId ||
    !signature ||
    !timestamp ||
    !traceId ||
    !instanceId ||
    !taskId ||
    !idempotencyKey
  ) {
    throw new Error('Missing required signed headers');
  }

  if (contractVersion !== INSTANCE_CONTRACT_VERSION) {
    throw new Error('Unsupported contract version');
  }

  if (keyId !== config.signingKeyId) {
    throw new Error('Unknown signing key');
  }

  if (instanceId !== config.instanceId) {
    throw new Error('Instance mismatch');
  }

  const canonicalPayload = buildCanonicalPayload(
    {
      idempotencyKey,
      instanceId,
      keyId,
      taskId,
      timestamp,
      traceId,
    },
    rawBody,
  );

  const expected = signCanonicalPayload(config.signingSecret, canonicalPayload);
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid signature');
  }

  return {
    headers: {
      [INSTANCE_SIGNATURE_HEADERS.contractVersion]: contractVersion,
      [INSTANCE_SIGNATURE_HEADERS.idempotencyKey]: idempotencyKey,
      [INSTANCE_SIGNATURE_HEADERS.instanceId]: instanceId,
      [INSTANCE_SIGNATURE_HEADERS.keyId]: keyId,
      [INSTANCE_SIGNATURE_HEADERS.signature]: signature,
      [INSTANCE_SIGNATURE_HEADERS.taskId]: taskId,
      [INSTANCE_SIGNATURE_HEADERS.timestamp]: timestamp,
      [INSTANCE_SIGNATURE_HEADERS.traceId]: traceId,
    },
    rawBody,
  };
}

// Exporting the signer lets local scripts and future SDKs generate valid test
// requests without duplicating the canonicalization rules.
export function createRequestSignature(identity: SignedRequestIdentity, rawBody: string, secret: string): string {
  return signCanonicalPayload(secret, buildCanonicalPayload(identity, rawBody));
}
