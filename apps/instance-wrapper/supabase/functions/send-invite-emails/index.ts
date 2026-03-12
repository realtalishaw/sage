// @ts-ignore - Deno runtime
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno runtime
import { Resend } from "resend";

// @ts-ignore - Deno runtime
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  type: "invite_code_used" | "welcome";
}

const getInviteCodeUsedEmail = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f9fafb; padding: 40px 20px; border-radius: 8px;">
        <h1 style="color: #111; margin-bottom: 20px; font-size: 24px; font-weight: 600;">Congratulations!</h1>
        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Someone just signed up with your invite code, and you just got 48 extra hours free!
        </p>
        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Here's what you can do with 48 hours of GIA:
        </p>
        <ul style="color: #666; font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
            <li style="margin-bottom: 10px;">Automate your repetitive tasks and workflows</li>
            <li style="margin-bottom: 10px;">Research and synthesize information from multiple sources</li>
            <li style="margin-bottom: 10px;">Draft and edit documents, emails, and content</li>
            <li style="margin-bottom: 10px;">Analyze data and generate insights</li>
            <li style="margin-bottom: 10px;">Coordinate schedules and manage communications</li>
        </ul>
        <p style="color: #666; font-size: 16px; margin-bottom: 0;">
            Your extra time has been added to your account automatically. Enjoy!
        </p>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
        General Intelligence Agency
    </p>
</body>
</html>
`;

const getWelcomeEmail = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 40px 20px;">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi there,</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Welcome to GIA.</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Thank you for joining us.</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Think of GIA as your coworker.</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 30px;">Put it to work.</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 5px;">Best,</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 5px; font-weight: 600;">Talisha White</p>
        <p style="color: #666; font-size: 14px; margin-bottom: 0;">CEO, General Intelligence Agency</p>
    </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invite-emails function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to ${email}`);

    if (!email) {
      throw new Error("Email is required");
    }

    if (!type || !["invite_code_used", "welcome"].includes(type)) {
      throw new Error("Valid type (invite_code_used or welcome) is required");
    }

    let subject: string;
    let html: string;

    if (type === "invite_code_used") {
      subject = "You just earned 48 free hours! 🎉";
      html = getInviteCodeUsedEmail();
    } else {
      subject = "Welcome to GIA";
      html = getWelcomeEmail();
    }

    const emailResponse = await resend.emails.send({
      from: "Talisha White <talisha@generalintelligence.agency>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type} email sent successfully`,
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite-emails function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
