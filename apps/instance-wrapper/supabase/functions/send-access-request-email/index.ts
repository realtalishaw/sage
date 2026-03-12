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
}

const getAccessRequestEmail = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 40px 20px;">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi there,</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            We've received your request to access GIA.
        </p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Our team is reviewing applications and we'll be in touch soon.
        </p>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            In the meantime, stay connected with us:
        </p>
        <ul style="color: #333; font-size: 16px; margin-bottom: 30px; padding-left: 20px;">
            <li style="margin-bottom: 10px;">
                <a href="https://discord.gg/generalintelligence" style="color: #5865F2; text-decoration: none;">Join our Discord community</a>
            </li>
            <li style="margin-bottom: 10px;">
                <a href="https://twitter.com/gikiapp" style="color: #1DA1F2; text-decoration: none;">Follow us on Twitter</a>
            </li>
        </ul>
        <p style="color: #333; font-size: 16px; margin-bottom: 5px;">Best,</p>
        <p style="color: #333; font-size: 16px; margin-bottom: 5px; font-weight: 600;">The GIA Team</p>
        <p style="color: #666; font-size: 14px; margin-bottom: 0;">General Intelligence Agency</p>
    </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-access-request-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: EmailRequest = await req.json();
    
    console.log(`Sending access request confirmation email to ${email}`);

    if (!email) {
      throw new Error("Email is required");
    }

    const emailResponse = await resend.emails.send({
      from: "GIA Access <access@generalintelligence.agency>",
      to: [email],
      subject: "We've received your access request",
      html: getAccessRequestEmail(),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Access request confirmation email sent successfully",
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-access-request-email function:", error);
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
