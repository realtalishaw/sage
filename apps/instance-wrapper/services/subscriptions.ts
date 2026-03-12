/**
 * Subscriptions service
 * Uses Supabase edge functions for Stripe checkout
 */

import { supabase } from '@/src/integrations/supabase/client';

export interface SubscriptionStatus {
  subscribed: boolean;
  status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
}

/**
 * Check the current user's subscription status
 */
export const checkSubscription = async (): Promise<SubscriptionStatus> => {
  const { data, error } = await supabase.functions.invoke('check-subscription');
  
  if (error) {
    console.error('Error checking subscription:', error);
    throw error;
  }
  
  return data as SubscriptionStatus;
};

/**
 * Create a checkout session and get the URL
 */
export const createCheckoutSession = async (): Promise<{ url: string }> => {
  const { data, error } = await supabase.functions.invoke('create-checkout');
  
  if (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
  
  return data as { url: string };
};

/**
 * Open the Stripe customer portal for subscription management
 */
export const openCustomerPortal = async (): Promise<{ url: string }> => {
  const { data, error } = await supabase.functions.invoke('customer-portal');
  
  if (error) {
    console.error('Error opening customer portal:', error);
    throw error;
  }
  
  return data as { url: string };
};

/**
 * Apply referral bonus when a referred user subscribes
 */
export const applyReferralBonus = async (
  referredUserId: string,
  inviteCode: string
): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.functions.invoke('apply-referral-bonus', {
    body: {
      referred_user_id: referredUserId,
      invite_code: inviteCode,
    },
  });
  
  if (error) {
    console.error('Error applying referral bonus:', error);
    throw error;
  }
  
  return data as { success: boolean; message: string };
};

// Legacy functions for backwards compatibility (can be removed later)
export interface CreateCheckoutSessionRequest {
  user_id: string;
  user_email?: string;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface UpdateSubscriptionFromPaymentLinkRequest {
  user_id: string;
}

export interface UpdateSubscriptionFromPaymentLinkResponse {
  success: boolean;
  subscription_id?: string;
}

/**
 * @deprecated Use checkSubscription() instead
 */
export const updateSubscriptionFromPaymentLink = async (
  user_id: string
): Promise<UpdateSubscriptionFromPaymentLinkResponse> => {
  try {
    await checkSubscription();
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false };
  }
};
