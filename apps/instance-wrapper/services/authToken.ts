/**
 * Auth Token Management Service
 * Handles GIA API key generation, storage, and retrieval
 */

import { supabase } from '@/src/integrations/supabase/client';

const TOKEN_STORAGE_KEY = 'gia_api_key';

/**
 * Generate a GIA API key for the current user
 * This calls the Supabase RPC function to generate a new API key
 */
export const generateApiToken = async (): Promise<string | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user for token generation:', userError);
      return null;
    }
    
    // Check if we already have a valid key stored
    const existingKey = getApiToken();
    if (existingKey && existingKey.startsWith('gia_')) {
      console.log('Using existing GIA API key');
      return existingKey;
    }
    
    // Generate new API key via RPC
    const { data, error } = await supabase.rpc('generate_user_api_key', {
      p_user_id: user.id,
      p_key_name: 'GIA Web App'
    });
    
    if (error) {
      console.error('Error generating API key:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const apiKey = data[0].full_key;
      
      // Store the key in localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, apiKey);
      
      console.log('GIA API key generated and stored');
      return apiKey;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating API token:', error);
    return null;
  }
};

/**
 * Get the stored GIA API key
 * Returns null if no key is stored
 */
export const getApiToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Check if a valid GIA API key exists
 */
export const hasApiToken = (): boolean => {
  const token = getApiToken();
  return token !== null && token.startsWith('gia_');
};

/**
 * Clear the stored API token (call on logout)
 */
export const clearApiToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  console.log('API token cleared');
};

/**
 * Ensure user has a valid API key, generating one if needed
 */
export const ensureApiToken = async (): Promise<string | null> => {
  if (hasApiToken()) {
    return getApiToken();
  }
  return await generateApiToken();
};

/**
 * Refresh the API token if needed
 * For GIA API keys, this regenerates the key
 */
export const refreshApiToken = async (): Promise<string | null> => {
  // Clear existing key and generate a new one
  clearApiToken();
  return await generateApiToken();
};
