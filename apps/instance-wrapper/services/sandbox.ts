import { supabase } from '../src/integrations/supabase/client';

export interface SandboxResponse {
  url: string;
  sandboxId: string;
  port: number;
  reused?: boolean;
  synced_from_s3?: boolean;
}

export interface SandboxError {
  error: string;
  details?: string;
}

// Get API URL from environment or use default
// Defaults to dev.gia.run for production
const API_BASE_URL = 'https://dev.gia.run';

/**
 * Get or create a sandbox URL for an app
 * @param appId - The ID of the app
 * @returns Promise with sandbox URL and metadata
 */
export async function getSandboxUrl(appId: string): Promise<SandboxResponse> {
  try {
    // Get the auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call the main API sandbox endpoint
    const apiUrl = `${API_BASE_URL}/api/v1/sandbox`;

    console.log(`[sandbox] Calling ${apiUrl} for app ${appId}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        force_refresh: false
      })
    });

    if (!response.ok) {
      const errorData: SandboxError = await response.json().catch(() => ({
        error: 'Failed to get sandbox URL',
        details: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.details || errorData.error || `Failed to get sandbox URL: ${response.statusText}`);
    }

    const data: SandboxResponse = await response.json();
    console.log(`[sandbox] Got sandbox URL:`, data);
    return data;
  } catch (error) {
    console.error('[sandbox] Error getting sandbox URL:', error);
    throw error;
  }
}

/**
 * Refresh/recreate a sandbox for an app
 * This will force creation of a new sandbox
 * @param appId - The ID of the app
 * @returns Promise with new sandbox URL and metadata
 */
export async function refreshSandbox(appId: string): Promise<SandboxResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call the main API sandbox endpoint with force_refresh
    const apiUrl = `${API_BASE_URL}/api/v1/sandbox`;

    console.log(`[sandbox] Refreshing sandbox for app ${appId}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        force_refresh: true
      })
    });

    if (!response.ok) {
      const errorData: SandboxError = await response.json().catch(() => ({
        error: 'Failed to refresh sandbox',
        details: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.details || errorData.error || `Failed to refresh sandbox: ${response.statusText}`);
    }

    const data: SandboxResponse = await response.json();
    console.log(`[sandbox] Sandbox refreshed:`, data);
    return data;
  } catch (error) {
    console.error('[sandbox] Error refreshing sandbox:', error);
    throw error;
  }
}
