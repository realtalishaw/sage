import { supabase } from '@/src/integrations/supabase/client';

export interface SupportTicketRequest {
  topic: string;
  subject: string;
  message: string;
  userName?: string;
}

export interface SupportTicketResponse {
  success: boolean;
  ticketId?: string;
  message?: string;
  error?: string;
}

/**
 * Submit a support ticket
 */
export const submitSupportTicket = async (
  request: SupportTicketRequest
): Promise<SupportTicketResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const supabaseUrl = 'https://wqeopjtdfpxifvrygcqt.supabase.co';
  const response = await fetch(
    `${supabaseUrl}/functions/v1/submit-support-ticket`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit support ticket');
  }

  return data;
};

export const SUPPORT_TOPICS = [
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'connectors', label: 'Connectors & Integrations' },
  { value: 'account', label: 'Account & Login' },
  { value: 'bugs', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
] as const;
