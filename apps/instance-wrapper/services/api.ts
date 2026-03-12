/**
 * Frontend-only task API mock.
 */

export interface CreateTaskPayload {
  assigned_to: string;
  agent_slug: string;
  agent_params: {
    task: string;
  };
  timeout: number;
  metadata: {
    source: string;
    priority: string;
    context_type?: string;
    account_slug?: string;
    [key: string]: string | undefined;
  };
}

export interface TaskResponse {
  id: string;
  status: string;
  result?: any;
  error_message?: string;
}

const taskStore = new Map<string, TaskResponse>();

const createTask = (result: string): TaskResponse => {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const task: TaskResponse = {
    id,
    status: 'completed',
    result,
  };
  taskStore.set(id, task);
  return task;
};

export const createAgentTask = async (taskText: string): Promise<TaskResponse> => {
  return createTask(`Mock task completed for: ${taskText}`);
};

export const getTaskStatus = async (taskId: string): Promise<TaskResponse> => {
  return taskStore.get(taskId) ?? {
    id: taskId,
    status: 'completed',
    result: 'Mock task completed.',
  };
};

export const createOnboardingContextTask = async (
  accountSlug: string,
  accountDisplayName: string,
): Promise<TaskResponse> => {
  return createTask(`Mock onboarding context gathered for ${accountDisplayName} (${accountSlug}).`);
};
