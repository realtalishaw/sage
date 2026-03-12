// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HAPPENSTANCE_API_URL = 'https://api.happenstance.ai/v1/research';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HAPPENSTANCE_API_KEY = Deno.env.get('HAPPENSTANCE_API_KEY');
    if (!HAPPENSTANCE_API_KEY) {
      throw new Error('HAPPENSTANCE_API_KEY is not configured');
    }

    const { action, research_id, name, context } = await req.json();

    if (action === 'submit') {
      // Submit a new research request
      const description = context 
        ? `${name} ${context}` 
        : name;

      console.log('Submitting research for:', description);

      const response = await fetch(HAPPENSTANCE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HAPPENSTANCE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Happenstance submit error:', response.status, errorText);
        throw new Error(`Happenstance API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Research submitted, ID:', data.id || data.research_id);

      return new Response(JSON.stringify({ 
        success: true, 
        research_id: data.id || data.research_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get') {
      // Get research results
      if (!research_id) {
        throw new Error('research_id is required for get action');
      }

      console.log('Getting research results for:', research_id);

      // Happenstance API: GET /v1/research/{id}
      const response = await fetch(`${HAPPENSTANCE_API_URL}/${research_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${HAPPENSTANCE_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Happenstance get error:', response.status, errorText);
        throw new Error(`Happenstance API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Research status:', data.status);

      // Extract bio from profile.summary.text if available
      let bio = null;
      let sources: string[] = [];

      if (data.profile) {
        // Get summary text
        if (data.profile.summary?.text) {
          bio = data.profile.summary.text;
        }
        // Get sources from summary URLs and profile URLs
        if (data.profile.summary?.urls) {
          sources = [...sources, ...data.profile.summary.urls];
        }
        if (data.profile.person_metadata?.profile_urls) {
          sources = [...sources, ...data.profile.person_metadata.profile_urls];
        }
        // Dedupe sources
        sources = [...new Set(sources)];
      }

      return new Response(JSON.stringify({
        success: true,
        status: data.status,
        profile: data.profile || null,
        bio,
        sources,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error('Invalid action. Use "submit" or "get"');
    }

  } catch (error) {
    console.error('Error in happenstance-lookup:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
