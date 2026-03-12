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
  console.log(`[APPLY-REFERRAL-BONUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { referred_user_id, invite_code } = await req.json();
    
    if (!referred_user_id || !invite_code) {
      throw new Error("Missing required fields: referred_user_id and invite_code");
    }
    logStep("Request parsed", { referred_user_id, invite_code });

    // Get invite code details
    const { data: codeDetails, error: codeError } = await supabaseClient
      .rpc("get_invite_code_details", { p_code: invite_code });
    
    if (codeError || !codeDetails || codeDetails.length === 0) {
      logStep("Invite code not found", { invite_code });
      return new Response(JSON.stringify({ success: false, error: "Invalid invite code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const referrerId = codeDetails[0].creator_id;
    const inviteCodeId = codeDetails[0].code_id;
    logStep("Found invite code", { referrerId, inviteCodeId });

    // Check if referred user has an active subscription
    const { data: referredSub, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", referred_user_id)
      .in("status", ["active", "trialing"])
      .single();

    if (subError || !referredSub) {
      logStep("Referred user has no active subscription", { referred_user_id });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Referred user must have an active subscription" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get referrer's subscription
    const { data: referrerSub, error: referrerSubError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", referrerId)
      .single();

    if (referrerSubError || !referrerSub) {
      logStep("Referrer has no subscription, granting bonus credit instead");
      
      // Grant bonus credit using existing function
      await supabaseClient.rpc("grant_invite_bonus_credit", {
        p_code_creator_id: referrerId,
        p_invite_code_id: inviteCodeId,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Bonus credit granted to referrer" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Referrer has subscription - extend their trial by 48 hours
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (referrerSub.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(referrerSub.stripe_subscription_id);
      
      if (subscription.trial_end) {
        // Extend trial by 48 hours (2 days = 172800 seconds)
        const newTrialEnd = subscription.trial_end + (48 * 60 * 60);
        
        await stripe.subscriptions.update(referrerSub.stripe_subscription_id, {
          trial_end: newTrialEnd,
        });

        logStep("Extended referrer's trial", { 
          oldTrialEnd: subscription.trial_end, 
          newTrialEnd 
        });

        // Update local database
        await supabaseClient
          .from("subscriptions")
          .update({
            trial_end: new Date(newTrialEnd * 1000).toISOString(),
            referral_bonus_hours: (referrerSub.referral_bonus_hours || 0) + 48,
          })
          .eq("user_id", referrerId);
      }
    }

    // Update referred user's subscription with referrer info
    await supabaseClient
      .from("subscriptions")
      .update({ referred_by: referrerId })
      .eq("user_id", referred_user_id);

    logStep("Referral bonus applied successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Referrer granted 48 additional trial hours" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in apply-referral-bonus", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
