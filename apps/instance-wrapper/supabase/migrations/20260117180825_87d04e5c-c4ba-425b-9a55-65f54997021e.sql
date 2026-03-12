-- Drop the existing constraint
ALTER TABLE workstream_events DROP CONSTRAINT IF EXISTS workstream_events_event_type_check;

-- Add new constraint with user_message included
ALTER TABLE workstream_events ADD CONSTRAINT workstream_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'system'::text, 
  'task_started'::text, 
  'task_completed'::text, 
  'task_discovered'::text, 
  'decision_required'::text, 
  'artifact_created'::text, 
  'calendar_event'::text, 
  'email_event'::text, 
  'integration_connected'::text, 
  'agent_message'::text, 
  'user_message'::text,
  'error'::text, 
  'success'::text
]));