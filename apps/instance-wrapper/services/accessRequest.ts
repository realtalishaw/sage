/**
 * Access Request API service
 * Sends confirmation emails via Supabase edge function
 */

import { supabase } from "../src/integrations/supabase/client";

export interface SendAccessRequestEmailResponse {
  success: boolean;
  message: string;
  email_id?: string;
  error?: string;
}

/**
 * Send access request confirmation email
 * 
 * @param email - Email address of the access request applicant
 * @returns The email response
 */
export const sendAccessRequestEmail = async (
  email: string
): Promise<SendAccessRequestEmailResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-access-request-email', {
      body: { email },
    });

    if (error) {
      console.error('Error sending access request email:', error);
      throw new Error(error.message || 'Failed to send access request email');
    }

    return data as SendAccessRequestEmailResponse;
  } catch (error) {
    console.error('Error calling access request email function:', error);
    throw error;
  }
};
