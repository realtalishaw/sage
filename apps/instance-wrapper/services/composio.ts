import { supabase } from '@/src/integrations/supabase/client';

export interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  metadata: {
    authScheme?: string;
    memberName?: string;
  };
}

export interface ComposioConnectionsResponse {
  connections: ComposioConnection[];
  totalItems: number;
  userId: string;
}

export interface ComposioToolkit {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  category: string;
  categories: { id: string; name: string }[];
  authSchemes: string[];
  toolsCount: number;
  triggersCount: number;
  noAuth: boolean;
  status: string;
}

export interface ComposioToolkitsResponse {
  toolkits: ComposioToolkit[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  nextCursor: string | null;
}

// Cache for toolkits
const TOOLKIT_CACHE_KEY = 'gia_composio_toolkits_cache';
const TOOLKIT_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface ToolkitCache {
  toolkits: ComposioToolkit[];
  timestamp: number;
  totalItems: number;
}

/**
 * Get cached toolkits or null if cache is expired/missing
 */
const getCachedToolkits = (): ToolkitCache | null => {
  try {
    const cached = localStorage.getItem(TOOLKIT_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: ToolkitCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > TOOLKIT_CACHE_TTL) {
      localStorage.removeItem(TOOLKIT_CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Save toolkits to cache
 */
const setCachedToolkits = (toolkits: ComposioToolkit[], totalItems: number): void => {
  try {
    const cache: ToolkitCache = {
      toolkits,
      timestamp: Date.now(),
      totalItems,
    };
    localStorage.setItem(TOOLKIT_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache toolkits:', error);
  }
};

/**
 * Fetch connected accounts from Composio for the current user
 */
export const getConnectedAccounts = async (): Promise<ComposioConnectionsResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await supabase.functions.invoke('composio-connections', {
    body: null,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to fetch connected accounts');
  }

  return response.data as ComposioConnectionsResponse;
};

/**
 * Fetch available toolkits from Composio with caching and pagination
 */
export const getToolkits = async (options?: {
  cursor?: string;
  limit?: number;
  search?: string;
  category?: string;
  useCache?: boolean;
}): Promise<ComposioToolkitsResponse> => {
  const { cursor, limit = 50, search, category, useCache = true } = options || {};
  
  // Check cache for first page without search/category filters
  if (useCache && !cursor && !search && !category) {
    const cached = getCachedToolkits();
    if (cached && cached.toolkits.length > 0) {
      console.log('Using cached toolkits:', cached.toolkits.length);
      return {
        toolkits: cached.toolkits,
        totalItems: cached.totalItems,
        totalPages: 1,
        currentPage: 1,
        nextCursor: null,
      };
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  // Build query params
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const supabaseUrl = 'https://wqeopjtdfpxifvrygcqt.supabase.co';
  const response = await fetch(
    `${supabaseUrl}/functions/v1/composio-toolkits?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch toolkits');
  }

  const data: ComposioToolkitsResponse = await response.json();

  // Cache if first page without filters
  if (!cursor && !search && !category) {
    setCachedToolkits(data.toolkits, data.totalItems);
  }

  return data;
};

/**
 * Fetch all toolkits using cursor pagination (for full cache)
 */
export const getAllToolkits = async (): Promise<ComposioToolkit[]> => {
  // Check cache first
  const cached = getCachedToolkits();
  if (cached && cached.toolkits.length > 0) {
    console.log('Using cached toolkits (all):', cached.toolkits.length);
    return cached.toolkits;
  }

  const allToolkits: ComposioToolkit[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  const maxPages = 20; // Safety limit

  do {
    const response = await getToolkits({ 
      cursor: cursor || undefined, 
      limit: 100,
      useCache: false 
    });
    
    allToolkits.push(...response.toolkits);
    cursor = response.nextCursor;
    pageCount++;
    
    console.log(`Fetched page ${pageCount}, total toolkits: ${allToolkits.length}`);
  } while (cursor && pageCount < maxPages);

  // Cache all results
  setCachedToolkits(allToolkits, allToolkits.length);

  return allToolkits;
};

/**
 * Get a single toolkit from cache by slug/appName
 * Returns null if not found or cache is expired
 */
export const getToolkitFromCache = (slugOrAppName: string): ComposioToolkit | null => {
  const cached = getCachedToolkits();
  if (!cached || cached.toolkits.length === 0) return null;
  
  // Normalize the search term (lowercase, remove hyphens/underscores)
  const normalized = slugOrAppName.toLowerCase().replace(/[-_\s]/g, '');
  
  // Try to find by exact slug match first
  const exactMatch = cached.toolkits.find(t => t.slug.toLowerCase() === slugOrAppName.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Try normalized slug match
  const slugMatch = cached.toolkits.find(t => t.slug.toLowerCase().replace(/[-_\s]/g, '') === normalized);
  if (slugMatch) return slugMatch;
  
  // Try name match
  const nameMatch = cached.toolkits.find(t => t.name.toLowerCase().replace(/[-_\s]/g, '') === normalized);
  if (nameMatch) return nameMatch;
  
  return null;
};

/**
 * Clear the toolkits cache
 */
export const clearToolkitsCache = (): void => {
  localStorage.removeItem(TOOLKIT_CACHE_KEY);
};

/**
 * Disconnect an account from Composio
 *
 * NOTE: We call our Edge Function with POST to avoid browser CORS preflight issues
 * with DELETE. The Edge Function then performs the Composio v3 DELETE server-side.
 */
export const disconnectAccount = async (connectionId: string): Promise<void> => {
  const response = await supabase.functions.invoke('composio-connections', {
    body: {
      action: 'disconnect',
      connectionId,
    },
  });

  if (response.error) {
    // Show user-friendly message instead of technical details
    throw new Error('An error occurred while disconnecting');
  }

  // Edge functions sometimes return 200 with an error payload
  if (response.data?.error) {
    throw new Error('An error occurred while disconnecting');
  }
};

export interface ConnectIntegrationResponse {
  success: boolean;
  connectionId?: string;
  status?: string;
  redirectUrl?: string;
  authConfigId?: string;
  data?: any;
}

/**
 * Connect to an integration (toolkit) via Composio
 * This initiates the OAuth flow or returns connection details
 */
export const connectIntegration = async (
  toolkitSlug: string,
  callbackUrl?: string
): Promise<ConnectIntegrationResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const supabaseUrl = 'https://wqeopjtdfpxifvrygcqt.supabase.co';
  const response = await fetch(
    `${supabaseUrl}/functions/v1/composio-connect`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolkitSlug,
        callbackUrl: callbackUrl || window.location.href,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect integration');
  }

  return response.json();
};

/**
 * Get an icon for a given app name (fallback emoji if no logo)
 */
export const getAppIcon = (appName: string): string => {
  if (!appName) return '🔗';
  const iconMap: Record<string, string> = {
    gmail: '✉️',
    google_calendar: '📅',
    googlecalendar: '📅',
    slack: '💬',
    notion: '📓',
    github: '🐙',
    figma: '📐',
    linear: '📋',
    discord: '🎮',
    twitter: '🐦',
    x: '🐦',
    dropbox: '📦',
    drive: '📁',
    googledrive: '📁',
    google_drive: '📁',
    sheets: '📊',
    googlesheets: '📊',
    google_sheets: '📊',
    docs: '📄',
    googledocs: '📄',
    google_docs: '📄',
    zoom: '🎥',
    teams: '👥',
    microsoft_teams: '👥',
    outlook: '📧',
    trello: '📌',
    asana: '✅',
    jira: '🎯',
    airtable: '🧱',
    hubspot: '🔶',
    salesforce: '☁️',
    stripe: '💳',
    shopify: '🛒',
    spotify: '🎵',
    youtube: '▶️',
    linkedin: '💼',
    instagram: '📸',
    facebook: '👤',
    whatsapp: '💬',
    telegram: '✈️',
  };

  const normalizedName = appName.toLowerCase().replace(/[-_\s]/g, '');
  return iconMap[normalizedName] || iconMap[appName.toLowerCase()] || '🔗';
};

/**
 * Get a human-readable name for an app
 */
export const getAppDisplayName = (appName: string): string => {
  if (!appName) return 'Unknown App';
  const nameMap: Record<string, string> = {
    gmail: 'Gmail',
    google_calendar: 'Google Calendar',
    googlecalendar: 'Google Calendar',
    slack: 'Slack',
    notion: 'Notion',
    github: 'GitHub',
    figma: 'Figma',
    linear: 'Linear',
    discord: 'Discord',
    twitter: 'Twitter',
    x: 'X (Twitter)',
    dropbox: 'Dropbox',
    drive: 'Google Drive',
    googledrive: 'Google Drive',
    google_drive: 'Google Drive',
    sheets: 'Google Sheets',
    googlesheets: 'Google Sheets',
    google_sheets: 'Google Sheets',
    docs: 'Google Docs',
    googledocs: 'Google Docs',
    google_docs: 'Google Docs',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
    microsoft_teams: 'Microsoft Teams',
    outlook: 'Outlook',
    trello: 'Trello',
    asana: 'Asana',
    jira: 'Jira',
    airtable: 'Airtable',
    hubspot: 'HubSpot',
    salesforce: 'Salesforce',
    stripe: 'Stripe',
    shopify: 'Shopify',
    spotify: 'Spotify',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
  };

  const normalizedName = appName.toLowerCase().replace(/[-_\s]/g, '');
  return nameMap[normalizedName] || nameMap[appName.toLowerCase()] || 
    appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-_]/g, ' ');
};
