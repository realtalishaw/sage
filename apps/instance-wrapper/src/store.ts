import type { InstanceTaskAcceptedResponse, InstanceTaskRequest, InstanceTaskStatusResponse } from '@sage/instance-contracts';

// A simple in-memory store is enough for the first wrapper milestone. It lets us
// prove the API contract and fake task lifecycle transitions before we decide on
// the real persistence layer for per-instance history.
export class InMemoryTaskStore {
  private readonly tasks = new Map<string, InstanceTaskStatusResponse>();

  createAcceptedTask(task: InstanceTaskRequest): InstanceTaskAcceptedResponse {
    const accepted: InstanceTaskAcceptedResponse = {
      acceptedAt: new Date().toISOString(),
      idempotencyKey: task.idempotencyKey,
      instanceId: task.instanceId,
      status: 'accepted',
      taskId: task.taskId,
      traceId: task.traceId,
    };

    this.tasks.set(task.taskId, {
      ...accepted,
      lastUpdatedAt: accepted.acceptedAt,
      status: 'accepted',
    });

    return accepted;
  }

  getTask(taskId: string): InstanceTaskStatusResponse | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, update: Partial<InstanceTaskStatusResponse>): InstanceTaskStatusResponse | undefined {
    const current = this.tasks.get(taskId);

    if (!current) {
      return undefined;
    }

    const next: InstanceTaskStatusResponse = {
      ...current,
      ...update,
      lastUpdatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, next);

    return next;
  }
}
