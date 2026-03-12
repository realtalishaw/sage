import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Loader2, ChevronLeft, ChevronRight, AlertCircle, X, RotateCw } from 'lucide-react';
import { useTodoList, TodoItem } from '@/hooks/useTodoList';

interface TodoListProps {
  isExpanded: boolean;
  onToggleExpand?: () => void;
}

export const TodoList: React.FC<TodoListProps> = ({ isExpanded, onToggleExpand }) => {
  const {
    todos,
    loading,
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
    goToToday
  } = useTodoList();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newTaskId, setNewTaskId] = React.useState<string | null>(null);
  const [localInputs, setLocalInputs] = React.useState<Record<string, string>>({});
  const [errorModalTodo, setErrorModalTodo] = React.useState<TodoItem | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  // Focus newly created task
  useEffect(() => {
    if (newTaskId && inputRefs.current[newTaskId]) {
      inputRefs.current[newTaskId]?.focus();
      setNewTaskId(null);
    }
  }, [newTaskId, todos]);

  // Sync local inputs with todos
  useEffect(() => {
    const newInputs: Record<string, string> = {};
    todos.forEach(todo => {
      if (!(todo.id in localInputs)) {
        newInputs[todo.id] = todo.task;
      }
    });
    if (Object.keys(newInputs).length > 0) {
      setLocalInputs(prev => ({ ...prev, ...newInputs }));
    }
  }, [todos]);

  const handleAddTodo = async () => {
    const result = await addTodo('');
    if (result) {
      setEditingId(result.id);
      setNewTaskId(result.id);
      setLocalInputs(prev => ({ ...prev, [result.id]: '' }));
    }
  };

  const handleToggleComplete = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo?.isSubmitting || todo?.task_status === 'in_progress') return;

    // If failed, show error modal instead of toggling
    if (todo?.task_status === 'failed') {
      setErrorModalTodo(todo);
      return;
    }

    toggleComplete(id);
  };

  const handleRetry = async (id: string) => {
    setErrorModalTodo(null);
    await retryTask(id);
  };

  const handleUpdateText = (id: string, text: string) => {
    setLocalInputs(prev => ({ ...prev, [id]: text }));
  };

  const handleBlur = async (id: string) => {
    const text = localInputs[id] || '';
    const todo = todos.find(t => t.id === id);
    
    if (!text.trim()) {
      // Delete empty todos
      deleteTodo(id);
    } else {
      // Update text in database
      if (todo && todo.task !== text) {
        await updateTodoText(id, text);
      }
      // Submit to tasks API if not already submitted
      if (todo && !todo.task_id && !todo.isSubmitting && text.trim()) {
        submitToTasksApi(id, text);
      }
    }
    setEditingId(null);
  };

  const handleKeyDown = async (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = localInputs[id] || '';
      const todo = todos.find(t => t.id === id);
      
      if (text.trim()) {
        // Update and submit current task
        if (todo && todo.task !== text) {
          await updateTodoText(id, text);
        }
        if (todo && !todo.task_id && !todo.isSubmitting) {
          submitToTasksApi(id, text);
        }
        // Add new task
        handleAddTodo();
      }
    }
    if (e.key === 'Escape') {
      handleBlur(id);
    }
    if (e.key === 'Backspace') {
      const text = localInputs[id] || '';
      if (!text) {
        e.preventDefault();
        deleteTodo(id);
        setEditingId(null);
      }
    }
  };

  if (loading) {
    return (
      <motion.div
        layout
        className="relative w-full bg-[#212121] border border-white/5 rounded-[20px] overflow-hidden shadow-lg flex flex-col items-center justify-center p-8"
        style={{ flex: isExpanded ? 1 : 'none', minHeight: '150px' }}
      >
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="relative w-full bg-[#212121] border border-white/5 rounded-[20px] overflow-hidden shadow-lg flex flex-col"
      style={{ flex: isExpanded ? 1 : 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white/90">Todo</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Date navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousDay}
                disabled={!canGoBack}
                className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={isToday ? undefined : goToToday}
                className={`text-[11px] font-medium transition-colors ${
                  isToday ? 'text-white/40' : 'text-blue-400 hover:text-blue-300 cursor-pointer'
                }`}
              >
                {dateLabel}
              </button>
              <button
                onClick={goToNextDay}
                disabled={!canGoForward}
                className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={12} />
              </button>
            </div>
            <span className="text-[11px] text-white/20">•</span>
            <span className="text-[11px] text-white/40">
              {pendingCount} pending
            </span>
          </div>
        </div>
        {onToggleExpand ? (
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        ) : null}
      </div>

      {/* Task List */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        <AnimatePresence mode="popLayout">
          <div className="space-y-1">
            {todos.map(todo => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                className="group flex items-start gap-3 py-2"
              >
                <button
                  onClick={() => handleToggleComplete(todo.id)}
                  disabled={todo.isSubmitting || todo.task_status === 'in_progress'}
                  className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    todo.completed
                      ? 'bg-white border-white'
                      : todo.task_status === 'failed'
                      ? 'border-red-500 bg-red-500/20 hover:bg-red-500/30 cursor-pointer'
                      : todo.isSubmitting || todo.task_status === 'in_progress'
                      ? 'border-white/20 animate-pulse'
                      : 'border-white/30 hover:border-white/50'
                  }`}
                  title={todo.task_status === 'failed' ? 'Click to view error' : ''}
                >
                  {todo.completed && (
                    <div className="w-2 h-2 rounded-full bg-[#212121]" />
                  )}
                  {(todo.isSubmitting || todo.task_status === 'in_progress') && (
                    <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                  )}
                  {todo.task_status === 'failed' && (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  )}
                </button>
                <textarea
                  ref={el => { inputRefs.current[todo.id] = el; }}
                  value={localInputs[todo.id] ?? todo.task}
                  onChange={e => {
                    handleUpdateText(todo.id, e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={(e) => {
                    setEditingId(todo.id);
                    // Auto-resize on focus
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onBlur={() => handleBlur(todo.id)}
                  onKeyDown={e => handleKeyDown(e, todo.id)}
                  placeholder="New..."
                  disabled={todo.isSubmitting}
                  rows={1}
                  className={`flex-1 min-w-0 bg-transparent text-sm outline-none transition-all placeholder:text-white/30 resize-none overflow-hidden ${
                    todo.completed 
                      ? 'text-white/30 line-through' 
                      : todo.isSubmitting
                      ? 'text-white/50'
                      : 'text-white/90'
                  }`}
                />
              </motion.div>
            ))}
            
            {/* Add new task row - only show for today */}
            {isToday && (
              <motion.div
                layout
                className="flex items-center gap-3 py-2 cursor-pointer group"
                onClick={handleAddTodo}
              >
                <div className="w-5 h-5 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-all flex-shrink-0" />
                <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors">
                  New...
                </span>
              </motion.div>
            )}

            {/* Empty state for past days */}
            {!isToday && todos.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-sm text-white/30">No todos for this day</p>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {errorModalTodo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setErrorModalTodo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#2a2a2a] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-white">Task Failed</h3>
                </div>
                <button
                  onClick={() => setErrorModalTodo(null)}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Task:</p>
                  <p className="text-sm text-white/80">{errorModalTodo.task}</p>
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-1">Error:</p>
                  <p className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {errorModalTodo.task_error || 'An unknown error occurred'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleRetry(errorModalTodo.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  <RotateCw size={16} />
                  Retry Task
                </button>
                <button
                  onClick={() => setErrorModalTodo(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
