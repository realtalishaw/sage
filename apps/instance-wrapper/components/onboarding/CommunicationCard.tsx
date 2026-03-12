import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, MessageCircle, Smartphone, MessageSquare, Check, Search, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../Button';
import { getToolkits, connectIntegration, getConnectedAccounts, ComposioToolkit, ComposioConnection } from '@/services/composio';

interface CommunicationCardProps {
  onSelect: (methods: string[], details?: Record<string, string>) => void;
  initialMethods?: string[];
  initialDetails?: Record<string, string>;
}

type CommunicationMethod = 'email' | 'text' | 'app' | 'custom';

// Search terms to build initial communication/collaboration list
const INITIAL_SEARCH_TERMS = [
  'slack', 'discord', 'telegram', 'whatsapp', 'teams', 'zoom',
  'gmail', 'outlook', 'meet', 'webex', 'chat'
];

// Featured slugs for prioritization
const FEATURED_SLUGS = ['slack', 'discord', 'telegram', 'whatsapp', 'teams', 'zoom', 'gmail', 'outlook'];

export function CommunicationCard({ onSelect, initialMethods, initialDetails }: CommunicationCardProps) {
  const [selectedMethods, setSelectedMethods] = useState<Set<CommunicationMethod>>(
    new Set((initialMethods || []).filter(m => ['email', 'text', 'app', 'custom'].includes(m)) as CommunicationMethod[])
  );
  const [phoneNumber, setPhoneNumber] = useState(initialDetails?.text || '');
  
  // Composio integration state
  const [showConnectors, setShowConnectors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [baseToolkits, setBaseToolkits] = useState<ComposioToolkit[]>([]); // Initial loaded list
  const [searchResults, setSearchResults] = useState<ComposioToolkit[] | null>(null); // Search results from API
  const [connectedApps, setConnectedApps] = useState<ComposioConnection[]>([]);
  const [loadingToolkits, setLoadingToolkits] = useState(false);
  const [searchingToolkits, setSearchingToolkits] = useState(false);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [selectedConnectors, setSelectedConnectors] = useState<Set<string>>(
    new Set(initialMethods?.filter(m => !['email', 'text', 'app', 'custom'].includes(m)) || [])
  );
  
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const methods = [
    {
      id: 'email' as CommunicationMethod,
      name: 'Email',
      icon: <Mail size={24} />,
      description: 'Get updates via email',
    },
    {
      id: 'text' as CommunicationMethod,
      name: 'Text',
      icon: <MessageCircle size={24} />,
      description: 'Receive SMS notifications',
    },
    {
      id: 'app' as CommunicationMethod,
      name: 'Our App',
      icon: <Smartphone size={24} />,
      description: 'Get notified in the app',
    },
    {
      id: 'custom' as CommunicationMethod,
      name: 'Something else',
      icon: <MessageSquare size={24} />,
      description: 'Slack, Discord, etc.',
    },
  ];

  // Load communication toolkits when "custom" is selected
  useEffect(() => {
    if (selectedMethods.has('custom') && !showConnectors) {
      setShowConnectors(true);
      loadCommunicationToolkits();
    } else if (!selectedMethods.has('custom')) {
      setShowConnectors(false);
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [selectedMethods]);

  // Check URL for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedSlug = params.get('comm_connected');
    if (connectedSlug) {
      window.history.replaceState({}, '', '/onboarding/4');
      setSelectedConnectors(prev => new Set([...prev, connectedSlug]));
      loadConnectedAccounts();
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!showConnectors) return;
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchingToolkits(false);
      return;
    }
    
    setSearchingToolkits(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const result = await getToolkits({ search: searchQuery.trim(), limit: 20, useCache: false });
        setSearchResults(result.toolkits);
      } catch (err) {
        console.error('Error searching toolkits:', err);
        setSearchResults([]);
      } finally {
        setSearchingToolkits(false);
      }
    }, 300);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, showConnectors]);

  const loadCommunicationToolkits = async () => {
    setLoadingToolkits(true);
    try {
      // Search for specific communication apps by name
      const searchPromises = INITIAL_SEARCH_TERMS.map(term =>
        getToolkits({ search: term, limit: 5, useCache: false }).catch(() => ({ toolkits: [] }))
      );
      
      const [connData, ...searchResultsData] = await Promise.all([
        getConnectedAccounts().catch(() => ({ connections: [] })),
        ...searchPromises
      ]);
      
      // Combine and dedupe all search results
      const allToolkits: ComposioToolkit[] = [];
      searchResultsData.forEach(result => {
        result.toolkits.forEach((toolkit: ComposioToolkit) => {
          if (!allToolkits.find(t => t.slug === toolkit.slug)) {
            allToolkits.push(toolkit);
          }
        });
      });
      
      // Sort to prioritize featured apps
      allToolkits.sort((a, b) => {
        const aFeatured = FEATURED_SLUGS.findIndex(s => a.slug.toLowerCase().includes(s));
        const bFeatured = FEATURED_SLUGS.findIndex(s => b.slug.toLowerCase().includes(s));
        if (aFeatured !== -1 && bFeatured === -1) return -1;
        if (bFeatured !== -1 && aFeatured === -1) return 1;
        if (aFeatured !== -1 && bFeatured !== -1) return aFeatured - bFeatured;
        return 0;
      });
      
      setBaseToolkits(allToolkits);
      setConnectedApps(connData.connections || []);
    } catch (err) {
      console.error('Error loading communication toolkits:', err);
    } finally {
      setLoadingToolkits(false);
    }
  };

  const loadConnectedAccounts = async () => {
    try {
      const data = await getConnectedAccounts();
      setConnectedApps(data.connections || []);
    } catch (err) {
      console.error('Error loading connected accounts:', err);
    }
  };

  // Check if a toolkit is connected
  const isConnected = (toolkitSlug: string): boolean => {
    const normalizedSlug = toolkitSlug.toLowerCase().replace(/[-_\s]/g, '');
    return connectedApps.some(conn => {
      const connNormalized = conn.appName.toLowerCase().replace(/[-_\s]/g, '');
      return connNormalized === normalizedSlug || 
             connNormalized.includes(normalizedSlug) || 
             normalizedSlug.includes(connNormalized);
    });
  };

  // Determine which toolkits to display
  const displayedToolkits = useMemo(() => {
    if (!showConnectors || loadingToolkits) return [];
    
    // If we have search results from API, use those
    if (searchResults !== null) {
      return searchResults.slice(0, 12);
    }
    
    // Otherwise show base toolkits
    return baseToolkits.slice(0, 12);
  }, [searchResults, baseToolkits, loadingToolkits, showConnectors]);

  // Get the combined list for finding toolkit names
  const allKnownToolkits = useMemo(() => {
    const combined = [...baseToolkits];
    if (searchResults) {
      searchResults.forEach(t => {
        if (!combined.find(c => c.slug === t.slug)) {
          combined.push(t);
        }
      });
    }
    return combined;
  }, [baseToolkits, searchResults]);

  // Handle connect button click
  const handleConnectToolkit = async (toolkit: ComposioToolkit) => {
    setConnectingSlug(toolkit.slug);
    
    try {
      const callbackUrl = `${window.location.origin}/onboarding/4?comm_connected=${toolkit.slug}`;
      const result = await connectIntegration(toolkit.slug, callbackUrl);
      
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else if (result.success) {
        setSelectedConnectors(prev => new Set([...prev, toolkit.slug]));
        await loadConnectedAccounts();
      }
    } catch (err: any) {
      console.error('Error connecting:', err);
    } finally {
      setConnectingSlug(null);
    }
  };

  const handleMethodClick = (method: CommunicationMethod) => {
    setSelectedMethods((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(method)) {
        newSet.delete(method);
      } else {
        newSet.add(method);
      }
      return newSet;
    });
  };

  const toggleConnectorSelection = (slug: string) => {
    setSelectedConnectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        newSet.add(slug);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    if (selectedMethods.size === 0 && selectedConnectors.size === 0) return;

    const methodsArray = Array.from(selectedMethods);
    const connectorsArray = Array.from(selectedConnectors);
    const allMethods = [...methodsArray, ...connectorsArray];
    
    const details: Record<string, string> = {};

    if (selectedMethods.has('text') && phoneNumber) {
      details.text = phoneNumber;
    }
    
    // Add connected app names as details
    connectorsArray.forEach(slug => {
      const toolkit = allKnownToolkits.find(t => t.slug === slug);
      if (toolkit) {
        details[slug] = toolkit.name;
      }
    });

    onSelect(allMethods, Object.keys(details).length > 0 ? details : undefined);
  };

  const needsTextInput = selectedMethods.has('text');

  const canContinue =
    (selectedMethods.size > 0 || selectedConnectors.size > 0) &&
    (!needsTextInput || phoneNumber.length > 0);

  const isSearching = searchingToolkits || (searchQuery.trim() && searchResults === null);

  return (
    <div className="w-full max-w-2xl p-6 bg-[#212121] border border-white/10 rounded-[24px] shadow-lg">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/90 mb-2">
          How would you like me to reach you?
        </h3>
        <p className="text-xs text-white/50">
          Select all that apply. I'll let you know when your data is ready and send task suggestions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {methods.map((method) => {
          const isSelected = selectedMethods.has(method.id);
          return (
            <button
              key={method.id}
              onClick={() => handleMethodClick(method.id)}
              className={`
                p-4 rounded-[16px] border text-left transition-all relative
                ${
                  isSelected
                    ? 'bg-white/10 border-white/30 ring-2 ring-white/20'
                    : 'bg-[#0B0B0C] border-white/10 hover:border-white/20 hover:bg-white/5'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <div className="flex flex-col items-start gap-3">
                <div
                  className={`
                    w-12 h-12 rounded-[12px] flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/60'
                    }
                  `}
                >
                  {method.icon}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white/90 mb-1">{method.name}</h4>
                  <p className="text-xs text-white/50">{method.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditional Inputs */}
      {needsTextInput && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="block text-xs font-medium text-white/70 mb-2">
            What's your phone number?
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full h-12 px-4 bg-[#0B0B0C] border border-white/10 rounded-[16px] text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      )}

      {/* Communication Connectors Section */}
      {showConnectors && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-medium text-white/70">
              Connect a communication app
            </label>
            {baseToolkits.length > 0 && !searchQuery && (
              <span className="text-xs text-white/40">{baseToolkits.length} apps available</span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="w-full h-10 pl-10 pr-4 bg-[#0B0B0C] border border-white/10 rounded-[12px] text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 animate-spin" size={16} />
            )}
          </div>

          {/* Loading State */}
          {loadingToolkits && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          )}

          {/* Toolkit Grid */}
          {!loadingToolkits && displayedToolkits.length > 0 && (
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
              {displayedToolkits.map((toolkit) => {
                const connected = isConnected(toolkit.slug);
                const selected = selectedConnectors.has(toolkit.slug);
                const isConnecting = connectingSlug === toolkit.slug;
                
                return (
                  <div
                    key={toolkit.slug}
                    className={`
                      p-3 rounded-[12px] border transition-all
                      ${selected || connected
                        ? 'bg-white/10 border-white/30'
                        : 'bg-[#0B0B0C] border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {toolkit.logo ? (
                          <img 
                            src={toolkit.logo} 
                            alt={toolkit.name} 
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <MessageSquare size={14} className="text-white/60" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-white/90 truncate">{toolkit.name}</h4>
                      </div>

                      {connected ? (
                        <button
                          onClick={() => toggleConnectorSelection(toolkit.slug)}
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center transition-colors
                            ${selected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40 hover:bg-white/20'}
                          `}
                        >
                          <Check size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectToolkit(toolkit)}
                          disabled={isConnecting}
                          className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!loadingToolkits && !isSearching && displayedToolkits.length === 0 && searchQuery && (
            <p className="text-xs text-white/40 text-center py-4">
              No apps found for "{searchQuery}"
            </p>
          )}

          {/* Selected Connectors Summary */}
          {selectedConnectors.size > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-white/50">
                Selected: {Array.from(selectedConnectors).map(slug => {
                  const toolkit = allKnownToolkits.find(t => t.slug === slug);
                  return toolkit?.name || slug;
                }).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      <Button
        variant="primary"
        size="md"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full h-11 rounded-[18px] mt-2"
      >
        Continue
      </Button>
    </div>
  );
}
