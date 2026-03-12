// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v1";
const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client to get the user
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the Composio API key from environment
    const composioApiKey = Deno.env.get("COMPOSIO_API_KEY");
    if (!composioApiKey) {
      return new Response(
        JSON.stringify({ error: "Composio API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request to get action and params
    const url = new URL(req.url);
    let action = url.searchParams.get("action") || "list";
    let bodyParams: any = {};

    // Handle POST requests with body (for supabase.functions.invoke compatibility)
    if (req.method === "POST") {
      try {
        bodyParams = await req.json();
        if (bodyParams.action) {
          action = bodyParams.action;
        }
      } catch {
        // No body or invalid JSON, continue with query params
      }
    }

    if (action === "list") {
      // Use v3 API to fetch connected accounts (returns nanoid for delete compatibility)
      const composioUrl = new URL(`${COMPOSIO_V3_URL}/connected_accounts`);
      composioUrl.searchParams.set("user_id", user.id);
      composioUrl.searchParams.set("limit", "100");

      console.log("[composio-connections] Fetching accounts from v3:", composioUrl.toString());

      const response = await fetch(composioUrl.toString(), {
        method: "GET",
        headers: {
          "x-api-key": composioApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[composio-connections] Composio v3 API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch connected accounts", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      // Log first item to see available fields
      if (data.items && data.items.length > 0) {
        console.log("[composio-connections] Sample item fields:", Object.keys(data.items[0]));
        console.log("[composio-connections] Sample item:", JSON.stringify(data.items[0]));
      }

      // IMPORTANT: Composio API may return connections for all users, not just the requested user_id
      // We MUST filter client-side to only show connections belonging to this user
      const userItems = (data.items || []).filter((item) => {
        const itemUserId = item.user_id;
        if (!itemUserId) return false;
        return itemUserId === user.id;
      });

      console.log(`[composio-connections] Filtered ${data.items?.length || 0} items to ${userItems.length} for user ${user.id}`);

      // Transform the response to include only relevant fields
      // Note: v3 delete requires nanoid, so we capture both id formats
      // Also filter out EXPIRED connections - they don't count as connected
      const allConnections = userItems
        .filter((item) => item.status !== 'EXPIRED')
        .map((item) => ({
          id: item.id, // v3 API returns nanoid directly in id field
          legacyId: item.uuid || item.deprecated?.uuid, // Keep UUID as fallback
          appName: item.toolkit?.slug || item.appName || item.toolkitSlug || 'unknown',
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          labels: item.labels || [],
          metadata: {
            authScheme: item.authScheme,
            memberName: item.memberName,
          }
        }));

      // Deduplicate by appName - keep only the best connection per app
      // Priority: ACTIVE > INITIATED > others, then by most recent updatedAt
      const connectionsByApp = new Map();
      
      for (const conn of allConnections) {
        const existing = connectionsByApp.get(conn.appName);
        
        if (!existing) {
          connectionsByApp.set(conn.appName, conn);
        } else {
          // Compare to see if this connection is "better"
          const statusPriority = { 'ACTIVE': 3, 'INITIATED': 2, 'EXPIRED': 1 };
          const existingPriority = statusPriority[existing.status] || 0;
          const newPriority = statusPriority[conn.status] || 0;
          
          if (newPriority > existingPriority) {
            // New connection has better status
            connectionsByApp.set(conn.appName, conn);
          } else if (newPriority === existingPriority) {
            // Same status, prefer more recently updated
            const existingDate = new Date(existing.updatedAt || existing.createdAt);
            const newDate = new Date(conn.updatedAt || conn.createdAt);
            if (newDate > existingDate) {
              connectionsByApp.set(conn.appName, conn);
            }
          }
        }
      }

      const connections = Array.from(connectionsByApp.values());

      return new Response(
        JSON.stringify({ 
          connections, 
          totalItems: data.total_items || connections.length,
          userId: user.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "toolkits") {
      // Fetch available toolkits with pagination using v3 API
      const cursor = url.searchParams.get("cursor") || "";
      const limit = url.searchParams.get("limit") || "50";
      const search = url.searchParams.get("search") || "";
      const category = url.searchParams.get("category") || "";

      const composioUrl = new URL(`${COMPOSIO_V3_URL}/toolkits`);
      composioUrl.searchParams.set("limit", limit);
      composioUrl.searchParams.set("sort_by", "usage");
      composioUrl.searchParams.set("include_deprecated", "false");
      
      if (cursor) {
        composioUrl.searchParams.set("cursor", cursor);
      }
      if (search) {
        composioUrl.searchParams.set("search", search);
      }
      if (category) {
        composioUrl.searchParams.set("category", category);
      }

      console.log("Fetching toolkits from:", composioUrl.toString());

      const response = await fetch(composioUrl.toString(), {
        method: "GET",
        headers: {
          "x-api-key": composioApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Composio toolkits API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch toolkits", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      // Transform the v3 API response
      const toolkits = (data.items || []).map((item) => ({
        slug: item.slug,
        name: item.name,
        description: item.meta?.description || '',
        logo: item.meta?.logo || null,
        category: item.meta?.categories?.[0]?.name || '',
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
            // Cache for 1 hour since toolkits don't change often
            "Cache-Control": "public, max-age=3600",
          } 
        }
      );
    }

    if (action === "disconnect") {
      // Support both DELETE with query params and POST with body
      const connectionId = url.searchParams.get("connectionId") || bodyParams.connectionId;
      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: "Missing connectionId parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[composio-connections] Disconnecting account: ${connectionId}`);

      // Use v3 API for soft-delete
      const response = await fetch(`${COMPOSIO_V3_URL}/connected_accounts/${connectionId}`, {
        method: "DELETE",
        headers: {
          "x-api-key": composioApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[composio-connections] Disconnect error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect account", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle empty or non-JSON responses gracefully
      let result = null;
      const responseText = await response.text();
      if (responseText) {
        try {
          result = JSON.parse(responseText);
          console.log(`[composio-connections] Disconnect result:`, JSON.stringify(result));
        } catch {
          console.log(`[composio-connections] Disconnect returned non-JSON:`, responseText);
        }
      } else {
        console.log(`[composio-connections] Disconnect returned empty response (success)`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Account disconnected successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in composio-connections function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
