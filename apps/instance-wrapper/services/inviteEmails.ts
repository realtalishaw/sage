/**
 * Invite Email API service
 * Calls the Supabase edge function to send invite-related emails
 */

import { supabase } from '@/src/integrations/supabase/client';

export interface SendInviteCodeUsedEmailResponse {
  success: boolean;
  message: string;
  email_id?: string;
}

export interface SendWelcomeEmailResponse {
  success: boolean;
  message: string;
  email_id?: string;
}

/**
 * Send invite code used email to code creator
 * 
 * @param email - Email address of the code creator
 * @returns The email response
 */
export const sendInviteCodeUsedEmail = async (
  email: string
): Promise<SendInviteCodeUsedEmailResponse> => {
  try {
    console.log('Sending invite code used email to:', email);
    
    const { data, error } = await supabase.functions.invoke('send-invite-emails', {
      body: {
        email,
        type: 'invite_code_used'
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to send invite code used email: ${error.message}`);
    }

    console.log('Invite code used email sent successfully:', data);
    return data as SendInviteCodeUsedEmailResponse;
  } catch (error) {
    console.error('Error calling send-invite-emails edge function:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 * 
 * @param email - Email address of the new user
 * @returns The email response
 */
export const sendWelcomeEmail = async (
  email: string
): Promise<SendWelcomeEmailResponse> => {
  try {
    console.log('Sending welcome email to:', email);
    
    const { data, error } = await supabase.functions.invoke('send-invite-emails', {
      body: {
        email,
        type: 'welcome'
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    console.log('Welcome email sent successfully:', data);
    return data as SendWelcomeEmailResponse;
  } catch (error) {
    console.error('Error calling send-invite-emails edge function:', error);
    throw error;
  }
};
