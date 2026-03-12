// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackEmailRequest {
  feedback: string;
  userName?: string;
}

const FEEDBACK_EMAIL = "talisha@generalintelligence.agency";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-feedback-email] Processing request...");

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-feedback-email] No authorization header");
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[send-feedback-email] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-feedback-email] User authenticated:", user.id);

    // Parse request body
    const { feedback, userName }: FeedbackEmailRequest = await req.json();

    // Validate required fields
    if (!feedback || feedback.trim().length < 10) {
      console.error("[send-feedback-email] Invalid feedback");
      return new Response(
        JSON.stringify({ error: "Feedback must be at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = user.email || "unknown@email.com";
    const displayName = userName || userEmail.split("@")[0];

    console.log("[send-feedback-email] Sending emails for:", userEmail);

    // Format date for email
    const feedbackDate = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Send notification email to team
    console.log("[send-feedback-email] Sending notification to team...");
    const teamEmailResult = await resend.emails.send({
      from: "GIA Feedback <feedback@generalintelligence.agency>",
      to: [FEEDBACK_EMAIL],
      reply_to: userEmail,
      subject: `[Feedback] New submission from ${displayName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">New Feedback Received</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 14px;">Shape the Future submission</p>
          </div>
          
          <div style="padding: 32px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;">From:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;"><strong>${displayName}</strong> (${userEmail})</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Date:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${feedbackDate}</td>
              </tr>
            </table>
            
            <div style="margin-top: 24px;">
              <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Feedback</h3>
              <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; color: #333; line-height: 1.6; white-space: pre-wrap;">${feedback}</div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; color: #888; font-size: 12px;">
            <p>Reply directly to this email to respond to ${displayName}.</p>
            <p>User ID: ${user.id}</p>
          </div>
        </div>
      `,
    });

    if (teamEmailResult.error) {
      console.error("[send-feedback-email] Error sending team email:", teamEmailResult.error);
    } else {
      console.log("[send-feedback-email] Team notification sent successfully");
    }

    // Send thank you email to user
    console.log("[send-feedback-email] Sending thank you to user...");
    const userEmailResult = await resend.emails.send({
      from: "GIA Team <feedback@generalintelligence.agency>",
      to: [userEmail],
      subject: "Thank you for your feedback!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: white; text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Thank You, ${displayName}!</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 16px;">Your feedback is the fuel for GIA's evolution.</p>
          </div>
          
          <div style="padding: 32px 0; text-align: center;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We review every submission and use it to make GIA better for everyone.
            </p>
            
            <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; text-align: left;">
              <h3 style="color: #333; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Feedback</h3>
              <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${feedback.length > 500 ? feedback.substring(0, 500) + '...' : feedback}</p>
            </div>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>— The GIA Team</p>
          </div>
        </div>
      `,
    });

    if (userEmailResult.error) {
      console.error("[send-feedback-email] Error sending user email:", userEmailResult.error);
    } else {
      console.log("[send-feedback-email] User thank you email sent successfully");
    }

    console.log("[send-feedback-email] Feedback emails complete");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback emails sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-feedback-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
