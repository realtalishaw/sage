// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface FeedbackRequest {
  email: string;
  feedback: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(payload: {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, feedback }: FeedbackRequest = await req.json();

    if (!email || !feedback) {
      return new Response(
        JSON.stringify({ error: 'Email and feedback are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        },
      );
    }

    // Send confirmation email to the user
    await sendEmail({
      from: 'Sage <no-reply@joinsage.xyz>',
      to: email,
      subject: 'we got your feedback',
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #0B0B0C; font-size: 24px; margin-bottom: 16px;">thanks for your feedback!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            we've received your message and our team will review it carefully. here's a copy of what you sent:
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #0B0B0C; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${feedback}</p>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            we'll get back to you soon if we need more details.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 32px;">
            — the sage team 🌱
          </p>
        </div>
      `,
    });

    // Send notification email to sage team
    await sendEmail({
      from: 'Sage Feedback <feedback@joinsage.xyz>',
      to: 'sage@joinsage.xyz',
      replyTo: email,
      subject: `new feedback from ${email}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #0B0B0C; font-size: 24px; margin-bottom: 16px;">new feedback received</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 8px;">
            <strong>from:</strong> ${email}
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #0B0B0C; padding: 16px; border-radius: 4px; margin-top: 24px;">
            <p style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${feedback}</p>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            reply to this email to respond directly to ${email}
          </p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback sent successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  } catch (error) {
    console.error('Error sending feedback:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to send feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-feedback' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"email":"user@example.com","feedback":"This is my feedback"}'

*/
