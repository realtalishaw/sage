import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { createAgentTask } from '@/services/api';

export interface TodoItem {
  id: string;
  user_id: string;
  task: string;
  task_id: string | null;
  date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  isSubmitting?: boolean; // Local-only state
  isNew?: boolean; // Local-only state for newly created items
  task_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | null; // Task execution status
  task_error?: string | null; // Error message if task failed
}

// Get today's date in YYYY-MM-DD format (local timezone)
const getLocalDateString = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
};

// Format date for display
const formatDateLabel = (dateString: string): string => {
  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  
  if (dateString === today) return 'Today';
  if (dateString === yesterday) return 'Yesterday';
  
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export function useTodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const userIdRef = useRef<string | null>(null);

  // Fetch todos for selected date
  const fetchTodos = useCallback(async (date: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTodos([]);
        setLoading(false);
        return;
      }
      userIdRef.current = user.id;

      const { data, error: fetchError } = await supabase
        .from('todo_list')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching todos:', fetchError);
        setError(fetchError.message);
        return;
      }

      setTodos(data || []);
    } catch (err) {
      console.error('Error in fetchTodos:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available dates (dates that have todos)
  const fetchAvailableDates = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('todo_list')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (fetchError) {
        console.error('Error fetching available dates:', fetchError);
        return;
      }

      // Get unique dates
      const uniqueDates = [...new Set(data?.map(d => d.date) || [])];
      // Always include today
      const today = getLocalDateString();
      if (!uniqueDates.includes(today)) {
        uniqueDates.unshift(today);
      }
      setAvailableDates(uniqueDates);
    } catch (err) {
      console.error('Error in fetchAvailableDates:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTodos(selectedDate);
    fetchAvailableDates();
  }, [selectedDate, fetchTodos, fetchAvailableDates]);

  // Subscribe to realtime updates for todo_list
  useEffect(() => {
    const channel = supabase
      .channel('todo_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todo_list'
        },
        (payload) => {
          console.log('[useTodoList] Realtime update:', payload);
          // Refetch on any change
          fetchTodos(selectedDate);
          fetchAvailableDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, fetchTodos, fetchAvailableDates]);

  // Subscribe to tasks table for status updates
  useEffect(() => {
    const channel = supabase
      .channel('tasks_status_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        },
        async (payload) => {
          const updatedTask = payload.new as { id: string; status: string; error_message?: string };

          console.log('[useTodoList] Task status update received:', {
            taskId: updatedTask.id,
            status: updatedTask.status,
            error: updatedTask.error_message
          });

          // Update local state using callback to get latest todos
          setTodos(prev => {
            // Find todo with this task_id
            const todoToUpdate = prev.find(t => t.task_id === updatedTask.id);

            if (!todoToUpdate) {
              console.log('[useTodoList] No matching todo found for task_id:', updatedTask.id);
              return prev;
            }

            console.log('[useTodoList] Updating todo:', todoToUpdate.task, 'to status:', updatedTask.status);

            return prev.map(t =>
              t.task_id === updatedTask.id
                ? {
                    ...t,
                    task_status: updatedTask.status as TodoItem['task_status'],
                    task_error: updatedTask.error_message || null,
                    completed: updatedTask.status === 'completed' ? true : t.completed,
                    completed_at: updatedTask.status === 'completed' ? new Date().toISOString() : t.completed_at
                  }
                : t
            );
          });

          // Update database for completed tasks
          if (updatedTask.status === 'completed') {
            // Query to find the todo_id, then update it
            const { data: todoData, error: queryError } = await supabase
              .from('todo_list')
              .select('id')
              .eq('task_id', updatedTask.id)
              .single();

            if (queryError) {
              console.error('[useTodoList] Error querying todo_list:', queryError);
              return;
            }

            if (todoData) {
              console.log('[useTodoList] Marking todo as completed in database:', todoData.id);
              const { error: updateError } = await supabase
                .from('todo_list')
                .update({
                  completed: true,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', todoData.id);

              if (updateError) {
                console.error('[useTodoList] Error updating todo_list:', updateError);
              } else {
                console.log('[useTodoList] Successfully marked todo as completed');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[useTodoList] Tasks subscription status:', status);
      });

    return () => {
      console.log('[useTodoList] Unsubscribing from tasks updates');
      supabase.removeChannel(channel);
    };
  }, []); // Remove todos dependency to prevent subscription recreation

  // Add a new todo
  const addTodo = useCallback(async (task: string): Promise<TodoItem | null> => {
    if (!userIdRef.current) return null;

    const tempId = `temp-${Date.now()}`;
    const newTodo: TodoItem = {
      id: tempId,
      user_id: userIdRef.current,
      task,
      task_id: null,
      date: selectedDate,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true
    };

    // Optimistic update
    setTodos(prev => [...prev, newTodo]);

    try {
      const { data, error: insertError } = await supabase
        .from('todo_list')
        .insert({
          user_id: userIdRef.current,
          task,
          date: selectedDate
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding todo:', insertError);
        // Remove optimistic update
        setTodos(prev => prev.filter(t => t.id !== tempId));
        return null;
      }

      // Replace temp item with real one
      setTodos(prev => prev.map(t => t.id === tempId ? { ...data, isNew: false } : t));
      return data;
    } catch (err) {
      console.error('Error in addTodo:', err);
      setTodos(prev => prev.filter(t => t.id !== tempId));
      return null;
    }
  }, [selectedDate]);

  // Update todo text
  const updateTodoText = useCallback(async (id: string, task: string) => {
    // Skip temp items
    if (id.startsWith('temp-')) return;

    setTodos(prev => prev.map(t => t.id === id ? { ...t, task } : t));

    try {
      await supabase
        .from('todo_list')
        .update({ task, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating todo text:', err);
    }
  }, []);

  // Toggle todo completion
  const toggleComplete = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo || id.startsWith('temp-')) return;

    const newCompleted = !todo.completed;
    
    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === id 
        ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : t
    ));

    try {
      await supabase
        .from('todo_list')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error toggling todo:', err);
      // Revert on error
      setTodos(prev => prev.map(t => t.id === id ? todo : t));
    }
  }, [todos]);

  // Delete a todo
  const deleteTodo = useCallback(async (id: string) => {
    if (id.startsWith('temp-')) {
      setTodos(prev => prev.filter(t => t.id !== id));
      return;
    }

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistic update
    setTodos(prev => prev.filter(t => t.id !== id));

    try {
      await supabase
        .from('todo_list')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.error('Error deleting todo:', err);
      // Revert on error
      if (todo) {
        setTodos(prev => [...prev, todo]);
      }
    }
  }, [todos]);

  // Submit todo to /tasks API and link task_id
  const submitToTasksApi = useCallback(async (id: string, task: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo || todo.task_id || id.startsWith('temp-')) return;

    // Set submitting state
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isSubmitting: true, task_status: 'pending' } : t));

    try {
      console.log(`[useTodoList] Creating task via API: "${task}"`);
      console.log(`[useTodoList] Todo ID: ${id}`);

      const response = await createAgentTask(task);
      console.log(`[useTodoList] ✅ Task created successfully with ID: ${response.id}`);
      console.log(`[useTodoList] Initial task status: ${response.status || 'unknown'}`);

      // Update todo with task_id in database
      const { error: updateError } = await supabase
        .from('todo_list')
        .update({
          task_id: response.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('[useTodoList] Error updating todo with task_id:', updateError);
        throw updateError;
      }

      console.log(`[useTodoList] ✅ Linked todo ${id} to task ${response.id}`);

      // Update local state
      setTodos(prev => prev.map(t =>
        t.id === id
          ? {
              ...t,
              task_id: response.id,
              isSubmitting: false,
              task_status: (response.status as TodoItem['task_status']) || 'pending'
            }
          : t
      ));
    } catch (err) {
      console.error('[useTodoList] ❌ Error submitting to tasks API:', err);
      setTodos(prev => prev.map(t =>
        t.id === id
          ? { ...t, isSubmitting: false, task_status: 'failed', task_error: err instanceof Error ? err.message : 'Unknown error' }
          : t
      ));
    }
  }, [todos]);

  // Navigate to previous day
  const goToPreviousDay = useCallback(() => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  }, [availableDates, selectedDate]);

  // Navigate to next day (or today)
  const goToNextDay = useCallback(() => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  }, [availableDates, selectedDate]);

  // Go to today
  const goToToday = useCallback(() => {
    setSelectedDate(getLocalDateString());
  }, []);

  // Retry a failed task
  const retryTask = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo || !todo.task) return;

    console.log('[useTodoList] Retrying task:', todo.task);

    // Clear error and set status to submitting
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, task_status: null, task_error: null, isSubmitting: true } : t
    ));

    // Resubmit to tasks API
    await submitToTasksApi(id, todo.task);
  }, [todos, submitToTasksApi]);

  const pendingCount = todos.filter(t => !t.completed).length;
  const isToday = selectedDate === getLocalDateString();
  const dateLabel = formatDateLabel(selectedDate);
  const canGoBack = availableDates.indexOf(selectedDate) < availableDates.length - 1;
  const canGoForward = availableDates.indexOf(selectedDate) > 0;

  return {
    todos,
    loading,
    error,
    selectedDate,
    dateLabel,
    isToday,
    pendingCount,
    canGoBack,
    canGoForward,
    addTodo,
    updateTodoText,
    toggleComplete,
    deleteTodo,
    submitToTasksApi,
    retryTask,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    refetch: () => fetchTodos(selectedDate)
  };
}
