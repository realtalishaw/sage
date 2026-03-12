import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Loader2, Search, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '../Button';
import { 
  getConnectedAccounts, 
  getAllToolkits, 
  connectIntegration, 
  getAppIcon, 
  getAppDisplayName,
  ComposioToolkit,
  ComposioConnection 
} from '@/services/composio';
import { createOnboardingContextTask } from '@/services/api';

// Legacy interface for backward compatibility
export interface DataSourceOption {
  id: string;
  name: string;
  icon: string;
  status: 'not_connected' | 'connecting' | 'connected' | 'optional';
  description: string;
}

// Featured toolkit slugs to show by default
const FEATURED_SLUGS = ['googledrive', 'gmail', 'googlecalendar', 'slack'];

interface DataSourceCardProps {
  sources?: DataSourceOption[]; // Optional legacy prop
  onConnect: (sourceId: string) => void;
  onSkip: () => void;
  userId?: string; // Optional legacy prop
  useComposio?: boolean; // Whether to use real Composio integration
}

export function DataSourceCard({ sources: legacySources, onConnect, onSkip, userId, useComposio = true }: DataSourceCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [toolkits, setToolkits] = useState<ComposioToolkit[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ComposioConnection[]>([]);
  const [loadingToolkits, setLoadingToolkits] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Legacy mode state (for old sources prop)
  const [legacyStatuses, setLegacyStatuses] = useState<Record<string, DataSourceOption['status']>>({});

  // Load toolkits and connections on mount (only if using Composio)
  useEffect(() => {
    if (useComposio && !legacySources) {
      loadData();
    } else {
      setLoadingToolkits(false);
      setLoadingConnections(false);
    }
  }, [useComposio, legacySources]);

  const loadData = async () => {
    try {
      // Load both in parallel
      const [toolkitsData, connectionsData] = await Promise.all([
        getAllToolkits().catch(err => {
          console.error('Error loading toolkits:', err);
          return [];
        }),
        getConnectedAccounts().catch(err => {
          console.error('Error loading connections:', err);
          return { connections: [] };
        })
      ]);

      setToolkits(toolkitsData);
      setConnectedAccounts(connectionsData.connections || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load connectors');
    } finally {
      setLoadingToolkits(false);
      setLoadingConnections(false);
    }
  };

  // Check if a toolkit is connected
  const isConnected = (toolkitSlug: string): boolean => {
    const normalizedSlug = toolkitSlug.toLowerCase().replace(/[-_\s]/g, '');
    return connectedAccounts.some(conn => {
      const connNormalized = conn.appName.toLowerCase().replace(/[-_\s]/g, '');
      return connNormalized === normalizedSlug || 
             connNormalized.includes(normalizedSlug) || 
             normalizedSlug.includes(connNormalized);
    });
  };

  // Trigger a context-gathering task for the connected account
  const triggerContextGatheringTask = async (slug: string) => {
    const displayName = getAppDisplayName(slug);
    try {
      console.log(`[DataSourceCard] Triggering context task for: ${displayName}`);
      const taskResult = await createOnboardingContextTask(slug, displayName);
      console.log(`[DataSourceCard] Context task created:`, taskResult);
    } catch (err) {
      // Don't block the user flow if the task fails - just log it
      console.error(`[DataSourceCard] Failed to create context task:`, err);
    }
  };

  // Handle connect button click (Composio mode)
  const handleConnect = async (toolkit: ComposioToolkit) => {
    setConnectingSlug(toolkit.slug);
    setError(null);
    
    try {
      // Use current URL with a connected param for callback
      const callbackUrl = `${window.location.origin}/onboarding/3?connected=${toolkit.slug}`;
      const result = await connectIntegration(toolkit.slug, callbackUrl);
      
      console.log('Connect integration result:', result);
      
      if (result.redirectUrl) {
        // OAuth flow - redirect the user to authorize
        window.location.href = result.redirectUrl;
      } else if (result.success) {
        // No OAuth needed, connection was created directly
        onConnect(toolkit.slug);
        // Refresh connections
        const connectionsData = await getConnectedAccounts();
        setConnectedAccounts(connectionsData.connections || []);
        // Trigger context gathering in background
        triggerContextGatheringTask(toolkit.slug);
      }
    } catch (err: any) {
      console.error('Error connecting:', err);
      setError(err.message || 'Failed to connect. Please try again.');
    } finally {
      setConnectingSlug(null);
    }
  };

  // Handle connect for legacy mode
  const handleLegacyConnect = (sourceId: string) => {
    setLegacyStatuses(prev => ({ ...prev, [sourceId]: 'connecting' }));
    onConnect(sourceId);
    // Simulate connection success
    setTimeout(() => {
      setLegacyStatuses(prev => ({ ...prev, [sourceId]: 'connected' }));
    }, 2000);
  };

  // Filter and display toolkits (Composio mode)
  const displayedToolkits = useMemo(() => {
    if (legacySources || loadingToolkits) return [];
    
    if (!searchQuery.trim()) {
      // Show featured toolkits when no search
      const featured = toolkits.filter(t => 
        FEATURED_SLUGS.some(slug => 
          t.slug.toLowerCase().includes(slug) || 
          t.name.toLowerCase().replace(/\s/g, '').includes(slug)
        )
      );
      
      // If we found featured ones, return them; otherwise return first 4
      if (featured.length > 0) {
        return featured.slice(0, 4);
      }
      return toolkits.slice(0, 4);
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = toolkits.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query) ||
      t.slug.toLowerCase().includes(query)
    );
    
    return filtered.slice(0, 4);
  }, [searchQuery, toolkits, loadingToolkits, legacySources]);

  const noResults = searchQuery.trim() && displayedToolkits.length === 0 && !loadingToolkits && !legacySources;
  const hasAnyConnection = connectedAccounts.length > 0 || Object.values(legacyStatuses).some(s => s === 'connected');
  const isLoading = loadingToolkits || loadingConnections;

  // Check URL for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedSlug = params.get('connected');
    if (connectedSlug) {
      // Clean up the URL
      window.history.replaceState({}, '', '/onboarding/3');
      // Refresh connections after OAuth callback
      getConnectedAccounts()
        .then(data => {
          setConnectedAccounts(data.connections || []);
          onConnect(connectedSlug);
          // Trigger context gathering task for the newly connected account
          triggerContextGatheringTask(connectedSlug);
        })
        .catch(console.error);
    }
  }, [onConnect]);

  // Legacy mode render
  if (legacySources) {
    return (
      <div className="w-full max-w-2xl p-6 bg-[#212121] border border-white/10 rounded-[24px] shadow-lg">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white/90 mb-2">Connect your data sources</h3>
          <p className="text-xs text-white/50">
            Choose what you'd like to connect. You can always add more later.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {legacySources.map((source) => {
            const status = legacyStatuses[source.id] || source.status;
            return (
              <button
                key={source.id}
                onClick={() => {
                  if (status === 'not_connected' || status === 'optional') {
                    handleLegacyConnect(source.id);
                  }
                }}
                disabled={status === 'connecting' || status === 'connected'}
                className={`
                  relative p-4 rounded-[16px] border text-left transition-all
                  ${
                    status === 'connected'
                      ? 'bg-green-500/10 border-green-500/30 cursor-default'
                      : status === 'connecting'
                      ? 'bg-blue-500/10 border-blue-500/30 cursor-wait'
                      : 'bg-[#0B0B0C] border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-lg
                      ${
                        status === 'connected'
                          ? 'bg-green-500/20'
                          : status === 'connecting'
                          ? 'bg-blue-500/20'
                          : 'bg-white/10'
                      }
                    `}
                  >
                    {status === 'connecting' ? (
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                    ) : status === 'connected' ? (
                      <CheckCircle size={20} className="text-green-400" />
                    ) : (
                      <span>{getAppIcon(source.id)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white/90">{source.name}</h4>
                      {status === 'connected' && (
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                          Connected
                        </span>
                      )}
                      {status === 'connecting' && (
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                          Connecting...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2">{source.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onSkip}
            className="flex-1 h-11 rounded-[18px]"
          >
            {hasAnyConnection ? 'Continue' : 'Skip for now'}
          </Button>
        </div>
      </div>
    );
  }

  // Composio mode render
  return (
    <div className="w-full max-w-2xl p-6 bg-[#212121] border border-white/10 rounded-[24px] shadow-lg">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/90 mb-2">Connect your tools</h3>
        <p className="text-xs text-white/50">
          Choose what you'd like to connect. You can always add more later.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all connectors..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0B0B0C] border border-white/10 rounded-xl text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin mb-3" />
          <p className="text-sm text-white/40">Loading connectors...</p>
        </div>
      ) : noResults ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm text-white/60 mb-2">
            No connector found for "{searchQuery}"
          </p>
          <p className="text-xs text-white/40">
            Don't worry! You can ask Gia to build one or connect it for you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {displayedToolkits.map((toolkit) => {
            const connected = isConnected(toolkit.slug);
            const isConnecting = connectingSlug === toolkit.slug;
            
            return (
              <button
                key={toolkit.slug}
                onClick={() => {
                  if (!connected && !isConnecting) {
                    handleConnect(toolkit);
                  }
                }}
                disabled={isConnecting || connected}
                className={`
                  relative p-4 rounded-[16px] border text-left transition-all
                  ${
                    connected
                      ? 'bg-green-500/10 border-green-500/30 cursor-default'
                      : isConnecting
                      ? 'bg-blue-500/10 border-blue-500/30 cursor-wait'
                      : 'bg-[#0B0B0C] border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-lg
                      ${
                        connected
                          ? 'bg-green-500/20'
                          : isConnecting
                          ? 'bg-blue-500/20'
                          : 'bg-white/10'
                      }
                    `}
                  >
                    {isConnecting ? (
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                    ) : connected ? (
                      <CheckCircle size={20} className="text-green-400" />
                    ) : toolkit.logo ? (
                      <img 
                        src={toolkit.logo} 
                        alt={toolkit.name} 
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.textContent = getAppIcon(toolkit.slug);
                        }}
                      />
                    ) : (
                      <span>{getAppIcon(toolkit.slug)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white/90">
                        {getAppDisplayName(toolkit.slug) || toolkit.name}
                      </h4>
                      {connected && (
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                          Connected
                        </span>
                      )}
                      {isConnecting && (
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                          Connecting...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2">
                      {toolkit.description || `Connect your ${toolkit.name} account`}
                    </p>
                  </div>

                  {!connected && !isConnecting && (
                    <ExternalLink size={14} className="text-white/20 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={onSkip}
          className="flex-1 h-11 rounded-[18px]"
        >
          {hasAnyConnection ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}
