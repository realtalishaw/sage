import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  INSTANCE_CONTRACT_VERSION,
  INSTANCE_CONTRACT_CONTENT_TYPE,
  INSTANCE_SIGNATURE_HEADERS,
  INSTANCE_RESPONSE_HEADERS,
} from '../src/auth.js';

describe('auth constants', () => {
  it('INSTANCE_CONTRACT_VERSION is a non-empty string', () => {
    assert.strictEqual(typeof INSTANCE_CONTRACT_VERSION, 'string');
    assert.ok(INSTANCE_CONTRACT_VERSION.length > 0);
  });

  it('INSTANCE_CONTRACT_CONTENT_TYPE is application/json', () => {
    assert.strictEqual(INSTANCE_CONTRACT_CONTENT_TYPE, 'application/json');
  });

  it('INSTANCE_SIGNATURE_HEADERS contains expected keys', () => {
    const expected = [
      'contractVersion',
      'keyId',
      'signature',
      'timestamp',
      'traceId',
      'instanceId',
      'taskId',
      'idempotencyKey',
    ];
    for (const key of expected) {
      assert.ok(key in INSTANCE_SIGNATURE_HEADERS, `missing ${key}`);
      assert.strictEqual(
        typeof INSTANCE_SIGNATURE_HEADERS[key as keyof typeof INSTANCE_SIGNATURE_HEADERS],
        'string',
      );
    }
  });

  it('INSTANCE_SIGNATURE_HEADERS values are x-sage- prefixed', () => {
    const values = Object.values(INSTANCE_SIGNATURE_HEADERS);
    for (const v of values) {
      assert.ok(v.startsWith('x-sage-'), `expected x-sage- prefix: ${v}`);
    }
  });

  it('INSTANCE_RESPONSE_HEADERS contains statusUrl', () => {
    assert.strictEqual(INSTANCE_RESPONSE_HEADERS.statusUrl, 'x-sage-task-status-url');
  });
});
