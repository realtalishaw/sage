// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: null,
        trial_end: null,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get subscriptions (including trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscriptions found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: null,
        trial_end: null,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const isActive = ["active", "trialing"].includes(subscription.status);
    
    // Safely handle timestamps - they might be null
    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null;
    const trialStart = subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null;
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString() 
      : null;
    const currentPeriodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000).toISOString() 
      : null;

    logStep("Subscription found", { 
      status: subscription.status, 
      isActive,
      trialEnd,
      currentPeriodEnd,
    });

    // Update local database with subscription info
    const { error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_price_id: subscription.items.data[0]?.price.id || null,
        status: subscription.status,
        trial_start: trialStart,
        trial_end: trialEnd,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      }, { onConflict: "user_id" });

    if (upsertError) {
      logStep("Error upserting subscription", { error: upsertError.message });
    } else {
      logStep("Subscription saved to database");
    }

    return new Response(JSON.stringify({
      subscribed: isActive,
      status: subscription.status,
      trial_end: trialEnd,
      current_period_end: currentPeriodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
