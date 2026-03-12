// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportTicketRequest {
  topic: string;
  subject: string;
  message: string;
  userName?: string;
}

const SUPPORT_EMAIL = "talisha@generalintelligence.agency";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[submit-support-ticket] Processing request...");

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[submit-support-ticket] No authorization header");
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
      console.error("[submit-support-ticket] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[submit-support-ticket] User authenticated:", user.id);

    // Parse request body
    const { topic, subject, message, userName }: SupportTicketRequest = await req.json();

    // Validate required fields
    if (!topic || !subject || !message) {
      console.error("[submit-support-ticket] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Topic, subject, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate field lengths
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject must be less than 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = user.email || "unknown@email.com";
    const displayName = userName || userEmail.split("@")[0];

    console.log("[submit-support-ticket] Creating ticket for:", userEmail);

    // Insert ticket into database
    const { data: ticket, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        user_email: userEmail,
        user_name: displayName,
        topic,
        subject,
        message,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[submit-support-ticket] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create support ticket" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[submit-support-ticket] Ticket created:", ticket.id);

    // Format date for email
    const ticketDate = new Date(ticket.created_at).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Send email to support team
    console.log("[submit-support-ticket] Sending email to support team...");
    const supportEmailResult = await resend.emails.send({
      from: "GIA Support <support@generalintelligence.agency>",
      to: [SUPPORT_EMAIL],
      reply_to: userEmail,
      subject: `[Support Ticket #${ticket.id.slice(0, 8)}] ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">New Support Ticket</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 14px;">Ticket #${ticket.id.slice(0, 8)}</p>
          </div>
          
          <div style="padding: 32px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;">From:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;"><strong>${displayName}</strong> (${userEmail})</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Topic:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;"><span style="background: #f0f0f0; padding: 4px 12px; border-radius: 12px; font-size: 13px;">${topic}</span></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Subject:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;"><strong>${subject}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Date:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${ticketDate}</td>
              </tr>
            </table>
            
            <div style="margin-top: 24px;">
              <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Message</h3>
              <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; color: #888; font-size: 12px;">
            <p>Reply directly to this email to respond to ${displayName}.</p>
            <p>User ID: ${user.id}</p>
          </div>
        </div>
      `,
    });

    if (supportEmailResult.error) {
      console.error("[submit-support-ticket] Error sending support email:", supportEmailResult.error);
      // Don't fail the request, ticket is already created
    } else {
      console.log("[submit-support-ticket] Support email sent successfully");
    }

    // Send confirmation email to user
    console.log("[submit-support-ticket] Sending confirmation to user...");
    const userEmailResult = await resend.emails.send({
      from: "GIA Support <support@generalintelligence.agency>",
      to: [userEmail],
      subject: `We received your support request - Ticket #${ticket.id.slice(0, 8)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: white; text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Thank you, ${displayName}!</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 16px;">We've received your support request.</p>
          </div>
          
          <div style="padding: 32px 0; text-align: center;">
            <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #666; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Ticket Number</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 700; font-family: monospace;">#${ticket.id.slice(0, 8)}</p>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Our team will review your request and get back to you within <strong>24 hours</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
              If you have any additional information to share, simply reply to this email.
            </p>
          </div>
          
          <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Request Summary</h3>
            <p style="color: #666; margin: 0 0 4px 0; font-size: 14px;"><strong>Topic:</strong> ${topic}</p>
            <p style="color: #666; margin: 0; font-size: 14px;"><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px;">
            <p>— The GIA Team</p>
          </div>
        </div>
      `,
    });

    if (userEmailResult.error) {
      console.error("[submit-support-ticket] Error sending user email:", userEmailResult.error);
      // Don't fail the request, ticket is already created
    } else {
      console.log("[submit-support-ticket] User confirmation email sent successfully");
    }

    console.log("[submit-support-ticket] Ticket submission complete");

    return new Response(
      JSON.stringify({
        success: true,
        ticketId: ticket.id,
        message: "Support ticket submitted successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[submit-support-ticket] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
