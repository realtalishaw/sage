// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
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

    // Parse request body
    const body = await req.json();
    const { toolkitSlug, callbackUrl } = body;

    if (!toolkitSlug) {
      return new Response(JSON.stringify({ error: "Missing toolkitSlug parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[composio-connect] Starting connection for toolkit: ${toolkitSlug}, user: ${user.id}`);

    // Step 1: Create or get an auth config for this toolkit
    // First try Composio managed auth, then fall back to custom API_KEY auth
    console.log(`[composio-connect] Creating auth config for: ${toolkitSlug}`);
    
    let authConfigData;
    let authConfigId;
    
    // Try Composio managed auth first
    const managedAuthResponse = await fetch(`${COMPOSIO_V3_URL}/auth_configs`, {
      method: "POST",
      headers: {
        "x-api-key": composioApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toolkit: {
          slug: toolkitSlug,
        },
        auth_config: {
          type: "use_composio_managed_auth",
        },
      }),
    });

    if (managedAuthResponse.ok) {
      authConfigData = await managedAuthResponse.json();
      console.log(`[composio-connect] Managed auth config response:`, JSON.stringify(authConfigData));
    } else {
      const errorText = await managedAuthResponse.text();
      console.log("[composio-connect] Managed auth not available, trying API_KEY auth:", errorText);
      
      // Fall back to custom API_KEY auth for toolkits that don't support managed auth
      const customAuthResponse = await fetch(`${COMPOSIO_V3_URL}/auth_configs`, {
        method: "POST",
        headers: {
          "x-api-key": composioApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolkit: {
            slug: toolkitSlug,
          },
          auth_config: {
            type: "use_custom_auth",
            authScheme: "API_KEY",
          },
        }),
      });

      if (!customAuthResponse.ok) {
        const customErrorText = await customAuthResponse.text();
        console.error("[composio-connect] Custom auth config creation also failed:", customAuthResponse.status, customErrorText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create auth config", 
            details: customErrorText,
            message: "This integration may not be available for connection. It might require manual configuration."
          }),
          { status: customAuthResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authConfigData = await customAuthResponse.json();
      console.log(`[composio-connect] Custom auth config response:`, JSON.stringify(authConfigData));
    }
    
    // The response might have id at root or nested - check common patterns
    authConfigId = authConfigData.id || authConfigData.auth_config?.id || authConfigData.authConfig?.id || authConfigData.data?.id;
    
    if (!authConfigId) {
      console.error("[composio-connect] Could not find auth config ID in response:", JSON.stringify(authConfigData));
      return new Response(
        JSON.stringify({ error: "Auth config ID not found in response", details: JSON.stringify(authConfigData) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[composio-connect] Auth config created/retrieved: ${authConfigId}`);

    // Step 2: Use Connect Link (hosted authentication) to get a redirect URL
    console.log(`[composio-connect] Creating connect link with auth config: ${authConfigId}`);
    
    const connectLinkResponse = await fetch(`${COMPOSIO_V3_URL}/connected_accounts/link`, {
      method: "POST",
      headers: {
        "x-api-key": composioApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        auth_config_id: authConfigId,
        callback_url: callbackUrl || "",
      }),
    });

    if (!connectLinkResponse.ok) {
      const errorText = await connectLinkResponse.text();
      console.error("[composio-connect] Connect link creation error:", connectLinkResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create connect link", details: errorText }),
        { status: connectLinkResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const connectLinkData = await connectLinkResponse.json();
    
    console.log(`[composio-connect] Connect link response:`, JSON.stringify(connectLinkData));

    // The response should contain a redirect URL for the hosted authentication flow
    const redirectUrl = connectLinkData.redirect_url || connectLinkData.redirectUrl || connectLinkData.url;
    
    if (!redirectUrl) {
      console.error("[composio-connect] No redirect URL in response:", JSON.stringify(connectLinkData));
      return new Response(
        JSON.stringify({ error: "No redirect URL returned", details: JSON.stringify(connectLinkData) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: redirectUrl,
        connectionRequestId: connectLinkData.id || connectLinkData.connection_request_id,
        authConfigId: authConfigId,
        data: connectLinkData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[composio-connect] Unhandled error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
