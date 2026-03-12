/**
 * Task Monitor Hook
 * Monitors task IDs for completion status via polling
 */

import { useEffect, useRef, useCallback } from 'react';
import { getTaskStatus } from '@/services/api';

interface MonitoredTask {
  taskId: string;
  localId: string;
  pollInterval: NodeJS.Timeout;
}

interface UseTaskMonitorOptions {
  onTaskComplete: (localId: string, result?: any) => void;
  onTaskError?: (localId: string, error: string) => void;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export const useTaskMonitor = ({
  onTaskComplete,
  onTaskError,
  pollIntervalMs = 3000,
  maxPollAttempts = 200, // 10 minutes at 3s intervals
}: UseTaskMonitorOptions) => {
  const monitoredTasks = useRef<Map<string, MonitoredTask>>(new Map());
  const pollCounts = useRef<Map<string, number>>(new Map());

  const stopMonitoring = useCallback((taskId: string) => {
    const task = monitoredTasks.current.get(taskId);
    if (task) {
      clearInterval(task.pollInterval);
      monitoredTasks.current.delete(taskId);
      pollCounts.current.delete(taskId);
      console.log(`[TaskMonitor] Stopped monitoring task: ${taskId}`);
    }
  }, []);

  const pollTask = useCallback(async (taskId: string, localId: string) => {
    try {
      const count = (pollCounts.current.get(taskId) || 0) + 1;
      pollCounts.current.set(taskId, count);

      if (count > maxPollAttempts) {
        console.warn(`[TaskMonitor] Max poll attempts reached for task: ${taskId}`);
        stopMonitoring(taskId);
        onTaskError?.(localId, 'Task timed out');
        return;
      }

      console.log(`[TaskMonitor] Polling task ${taskId} (attempt ${count})`);
      const response = await getTaskStatus(taskId);

      if (response.status === 'completed') {
        console.log(`[TaskMonitor] Task completed: ${taskId}`, response.result);
        stopMonitoring(taskId);
        onTaskComplete(localId, response.result);
      } else if (response.status === 'failed' || response.status === 'error') {
        console.error(`[TaskMonitor] Task failed: ${taskId}`, response.error_message);
        stopMonitoring(taskId);
        onTaskError?.(localId, response.error_message || 'Task failed');
      }
      // For 'pending', 'running', etc. - continue polling
    } catch (error) {
      console.error(`[TaskMonitor] Error polling task ${taskId}:`, error);
      // Don't stop on network errors, keep trying
    }
  }, [maxPollAttempts, onTaskComplete, onTaskError, stopMonitoring]);

  const startMonitoring = useCallback((taskId: string, localId: string) => {
    // Don't monitor the same task twice
    if (monitoredTasks.current.has(taskId)) {
      console.log(`[TaskMonitor] Task already being monitored: ${taskId}`);
      return;
    }

    console.log(`[TaskMonitor] Starting to monitor task: ${taskId} (local: ${localId})`);

    // Start polling immediately, then at intervals
    pollTask(taskId, localId);

    const interval = setInterval(() => {
      pollTask(taskId, localId);
    }, pollIntervalMs);

    monitoredTasks.current.set(taskId, {
      taskId,
      localId,
      pollInterval: interval,
    });
  }, [pollIntervalMs, pollTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      monitoredTasks.current.forEach((task) => {
        clearInterval(task.pollInterval);
      });
      monitoredTasks.current.clear();
      pollCounts.current.clear();
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
  };
};
