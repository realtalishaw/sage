// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract task ID from path if present (e.g., /tasks-api/abc-123)
    const taskId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    // GET /tasks-api/:id - Get task status
    if (req.method === 'GET' && taskId) {
      console.log(`[tasks-api] GET task status for: ${taskId}`);

      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, result, error_message, error_details, completed_at')
        .eq('id', taskId)
        .maybeSingle();

      if (error) {
        console.error('[tasks-api] Error fetching task:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch task', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[tasks-api] Task ${taskId} status: ${data.status}`);
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tasks-api - Create new task
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('[tasks-api] Creating task with payload:', JSON.stringify(body));

      const { assigned_to, agent_slug, agent_params, timeout, metadata } = body;

      if (!assigned_to || !agent_slug) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: assigned_to, agent_slug' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert task into database
      // Note: task_type must be 'agent' or 'approval' per valid_task_type constraint
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          assigned_to,
          task_type: 'agent', // Fixed value per constraint; agent_slug goes in payload
          status: 'pending',
          payload: {
            agent_slug,
            agent_params: agent_params || {},
            timeout: timeout || 600,
          },
          metadata: metadata || {},
        })
        .select('id, status')
        .single();

      if (error) {
        console.error('[tasks-api] Error creating task:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create task', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[tasks-api] Task created with ID: ${data.id}`);
      return new Response(
        JSON.stringify({ id: data.id, status: data.status }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[tasks-api] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
