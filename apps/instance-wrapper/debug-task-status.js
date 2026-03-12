import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wqeopjtdfpxifvrygcqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZW9wanRkZnB4aWZ2cnlnY3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MjMsImV4cCI6MjA4MzI5MjgyM30.isw7scBzVzVVrveN258LbuCcii6G1VFkQrbtFLhYVuk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTaskStatus() {
  console.log('Checking todo_list items with task_ids...\n');

  // Get todos with task_ids
  const { data: todos, error: todoError } = await supabase
    .from('todo_list')
    .select('*')
    .not('task_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (todoError) {
    console.error('Error fetching todos:', todoError);
    return;
  }

  console.log(`Found ${todos.length} todos with task_ids:\n`);

  for (const todo of todos) {
    console.log(`Todo: ${todo.task}`);
    console.log(`  ID: ${todo.id}`);
    console.log(`  Task ID: ${todo.task_id}`);
    console.log(`  Completed: ${todo.completed}`);
    console.log(`  Date: ${todo.date}`);

    // Check corresponding task
    if (todo.task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, status, error_message, created_at, updated_at')
        .eq('id', todo.task_id)
        .single();

      if (taskError) {
        console.log(`  ❌ Task not found or error: ${taskError.message}`);
      } else {
        console.log(`  Task Status: ${task.status}`);
        console.log(`  Task Error: ${task.error_message || 'None'}`);
        console.log(`  Task Created: ${task.created_at}`);
        console.log(`  Task Updated: ${task.updated_at}`);
      }
    }
    console.log('');
  }
}

checkTaskStatus().then(() => process.exit(0));
