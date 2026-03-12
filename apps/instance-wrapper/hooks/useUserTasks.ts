import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { DecisionCard } from '../types';
import type { Tables } from '@/src/integrations/supabase/types';

type UserTask = Tables<'user_tasks'>;

export function useUserTasks() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching user tasks:', fetchError);
        setError(fetchError.message);
        return;
      }

      setTasks(data || []);
    } catch (err) {
      console.error('Error in useUserTasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks'
        },
        () => {
          // Refetch on any change
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  // Convert tasks to DecisionCard format
  const decisionCards: DecisionCard[] = tasks.map(task => ({
    id: task.id,
    question: task.action_required,
    contextNotes: task.context,
    impact: task.impact || 'No impact assessment available.',
    proposedAction: task.proposed_action || 'Approve this action'
  }));

  const approveTask = async (taskId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('user_tasks')
        .update({
          status: 'approved',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        console.error('Error approving task:', updateError);
        return { success: false, error: updateError.message };
      }

      // Optimistically remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return { success: true };
    } catch (err) {
      console.error('Error in approveTask:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  const rejectTask = async (taskId: string, feedback?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('user_tasks')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: feedback ? { rejection_feedback: feedback } : undefined
        })
        .eq('id', taskId);

      if (updateError) {
        console.error('Error rejecting task:', updateError);
        return { success: false, error: updateError.message };
      }

      // Optimistically remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return { success: true };
    } catch (err) {
      console.error('Error in rejectTask:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  return {
    tasks,
    decisionCards,
    loading,
    error,
    approveTask,
    rejectTask,
    refetch: fetchTasks
  };
}
