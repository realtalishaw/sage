/**
 * Access check service
 * Checks if a user has access (active subscription or valid free hours)
 */

import { supabase } from '@/src/integrations/supabase/client';

/**
 * Check if the current user has access (active subscription or valid free hours)
 * 
 * @returns true if user has access, false otherwise
 */
export const checkUserHasAccess = async (): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Check access via RPC function
    const { data, error } = await supabase.rpc('check_user_has_access', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error checking user access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
};
