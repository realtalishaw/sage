// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const composioApiKey = Deno.env.get("COMPOSIO_API_KEY");
    if (!composioApiKey) {
      return new Response(JSON.stringify({ error: "Composio API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") || "";
    const limitRaw = url.searchParams.get("limit") || "50";
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const managedBy = url.searchParams.get("managed_by") || "";
    const sortBy = url.searchParams.get("sort_by") || "usage";
    const includeDeprecated = (url.searchParams.get("include_deprecated") || "false").toLowerCase() === "true";

    // Clamp limit to Composio max (1000)
    const limit = Math.min(1000, Math.max(1, Number(limitRaw) || 50));

    const composioUrl = new URL(`${COMPOSIO_V3_URL}/toolkits`);
    composioUrl.searchParams.set("limit", String(limit));
    composioUrl.searchParams.set("sort_by", sortBy);
    composioUrl.searchParams.set("include_deprecated", String(includeDeprecated));

    if (cursor) composioUrl.searchParams.set("cursor", cursor);
    if (search) composioUrl.searchParams.set("search", search);
    if (category) composioUrl.searchParams.set("category", category);
    if (managedBy) composioUrl.searchParams.set("managed_by", managedBy);

    console.log("[composio-toolkits] Fetching:", composioUrl.toString());

    const response = await fetch(composioUrl.toString(), {
      method: "GET",
      headers: {
        "x-api-key": composioApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[composio-toolkits] Composio API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch toolkits", details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const data = await response.json();

    const toolkits = (data.items || []).map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.meta?.description || "",
      logo: item.meta?.logo || null,
      category: item.meta?.categories?.[0]?.name || "",
      categories: item.meta?.categories || [],
      authSchemes: item.auth_schemes || [],
      toolsCount: item.meta?.tools_count || 0,
      triggersCount: item.meta?.triggers_count || 0,
      noAuth: item.no_auth || false,
      status: item.status,
    }));

    return new Response(
      JSON.stringify({
        toolkits,
        totalItems: data.total_items,
        totalPages: data.total_pages,
        currentPage: data.current_page,
        nextCursor: data.next_cursor,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache for 1 hour (toolkits are relatively stable)
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (error) {
    console.error("[composio-toolkits] Unhandled error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
});
