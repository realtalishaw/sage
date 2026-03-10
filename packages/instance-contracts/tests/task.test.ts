import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isInstanceTaskRequest } from '../src/task.js';

type MutableRequest = Record<string, unknown> & {
  task: Record<string, unknown>;
  runtime: Record<string, unknown>;
  session: Record<string, unknown>;
};

function validMinimalRequest(): MutableRequest {
  return {
    createdAt: '2026-03-09T12:00:00Z',
    idempotencyKey: 'ikey-123',
    instanceId: 'inst-abc',
    task: {
      instructions: 'Do something',
      kind: 'general',
      title: 'A task',
    },
    taskId: 'task-xyz',
    traceId: 'trace-1',
    runtime: {
      priority: 'normal',
      sandbox: 'required',
    },
    session: {
      continuity: 'reuse',
      sessionKey: 'sess-key-1',
    },
    userId: 'user-1',
  };
}

describe('isInstanceTaskRequest', () => {
  describe('valid requests', () => {
    it('accepts a minimal valid request', () => {
      assert.strictEqual(isInstanceTaskRequest(validMinimalRequest()), true);
    });

    it('accepts all task kinds', () => {
      for (const kind of ['general', 'build', 'research', 'operations']) {
        const req = validMinimalRequest();
        req.task.kind = kind;
        assert.strictEqual(isInstanceTaskRequest(req), true, `kind=${kind}`);
      }
    });

    it('accepts all priorities', () => {
      for (const priority of ['low', 'normal', 'high', 'urgent']) {
        const req = validMinimalRequest();
        req.runtime.priority = priority;
        assert.strictEqual(isInstanceTaskRequest(req), true, `priority=${priority}`);
      }
    });

    it('accepts all sandbox policies', () => {
      for (const sandbox of ['required', 'preferred', 'disabled']) {
        const req = validMinimalRequest();
        req.runtime.sandbox = sandbox;
        assert.strictEqual(isInstanceTaskRequest(req), true, `sandbox=${sandbox}`);
      }
    });

    it('accepts all continuity modes', () => {
      for (const continuity of ['reuse', 'fork', 'stateless']) {
        const req = validMinimalRequest();
        req.session.continuity = continuity;
        assert.strictEqual(isInstanceTaskRequest(req), true, `continuity=${continuity}`);
      }
    });

    it('accepts maxRuntimeSeconds', () => {
      const req = validMinimalRequest();
      req.runtime.maxRuntimeSeconds = 300;
      assert.strictEqual(isInstanceTaskRequest(req), true);
    });

    it('accepts valid attachments', () => {
      const req = validMinimalRequest();
      req.task.attachments = [
        { id: 'a1', kind: 'file', label: 'File 1' },
        { id: 'a2', kind: 'image', label: 'Image', mimeType: 'image/png' },
        { id: 'a3', kind: 'url', label: 'URL', url: 'https://example.com' },
        { id: 'a4', kind: 'note', label: 'Note' },
      ];
      assert.strictEqual(isInstanceTaskRequest(req), true);
    });

    it('accepts optional context', () => {
      const req = validMinimalRequest();
      req.context = {
        aceAdvice: ['tip1', 'tip2'],
        interactionSummary: 'Summary',
        userMessage: 'User said something',
        metadata: { key: 'value', nested: { a: 1 } },
      };
      assert.strictEqual(isInstanceTaskRequest(req), true);
    });
  });

  describe('invalid: non-object or null', () => {
    it('rejects null', () => {
      assert.strictEqual(isInstanceTaskRequest(null), false);
    });

    it('rejects undefined', () => {
      assert.strictEqual(isInstanceTaskRequest(undefined), false);
    });

    it('rejects primitives', () => {
      assert.strictEqual(isInstanceTaskRequest(42), false);
      assert.strictEqual(isInstanceTaskRequest('string'), false);
      assert.strictEqual(isInstanceTaskRequest(true), false);
    });

    it('rejects arrays', () => {
      assert.strictEqual(isInstanceTaskRequest([]), false);
      assert.strictEqual(isInstanceTaskRequest([validMinimalRequest()]), false);
    });
  });

  describe('invalid: required string fields', () => {
    it('rejects missing createdAt', () => {
      const req = validMinimalRequest();
      delete (req as Record<string, unknown>).createdAt;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects empty string for required fields', () => {
      const req = validMinimalRequest();
      req.createdAt = '';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing idempotencyKey', () => {
      const req = validMinimalRequest();
      delete (req as Record<string, unknown>).idempotencyKey;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing taskId', () => {
      const req = validMinimalRequest();
      delete (req as Record<string, unknown>).taskId;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });
  });

  describe('invalid: task', () => {
    it('rejects invalid task.kind', () => {
      const req = validMinimalRequest();
      (req.task as Record<string, unknown>).kind = 'invalid';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing task.title', () => {
      const req = validMinimalRequest();
      delete (req.task as Record<string, unknown>).title;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing task.instructions', () => {
      const req = validMinimalRequest();
      delete (req.task as Record<string, unknown>).instructions;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects non-object task', () => {
      const req = validMinimalRequest();
      (req as Record<string, unknown>).task = null;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects invalid attachment kind', () => {
      const req = validMinimalRequest();
      req.task.attachments = [{ id: 'a1', kind: 'invalid', label: 'X' }];
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects attachment with missing id', () => {
      const req = validMinimalRequest();
      req.task.attachments = [{ id: '', kind: 'file', label: 'X' }];
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects attachments when not an array', () => {
      const req = validMinimalRequest();
      (req.task as Record<string, unknown>).attachments = {};
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });
  });

  describe('invalid: runtime', () => {
    it('rejects invalid priority', () => {
      const req = validMinimalRequest();
      (req.runtime as Record<string, unknown>).priority = 'critical';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects invalid sandbox', () => {
      const req = validMinimalRequest();
      (req.runtime as Record<string, unknown>).sandbox = 'none';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects non-number maxRuntimeSeconds', () => {
      const req = validMinimalRequest();
      (req.runtime as Record<string, unknown>).maxRuntimeSeconds = '300';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing runtime', () => {
      const req = validMinimalRequest();
      delete (req as Record<string, unknown>).runtime;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });
  });

  describe('invalid: session', () => {
    it('rejects invalid continuity', () => {
      const req = validMinimalRequest();
      (req.session as Record<string, unknown>).continuity = 'keep';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects empty sessionKey', () => {
      const req = validMinimalRequest();
      req.session.sessionKey = '';
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects missing session', () => {
      const req = validMinimalRequest();
      delete (req as Record<string, unknown>).session;
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });
  });

  describe('invalid: context', () => {
    it('rejects non-array aceAdvice', () => {
      const req = validMinimalRequest();
      req.context = { aceAdvice: 'not-array' };
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects non-JSON metadata (e.g. function)', () => {
      const req = validMinimalRequest();
      req.context = { metadata: (() => {}) as unknown as Record<string, unknown> };
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });

    it('rejects non-string interactionSummary', () => {
      const req = validMinimalRequest();
      req.context = { interactionSummary: 123 };
      assert.strictEqual(isInstanceTaskRequest(req), false);
    });
  });
});
