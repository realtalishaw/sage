import React from 'react';
import { CreditCard, Cable, HelpCircle, MessageSquare, Edit, X, AlertTriangle, Loader2, ExternalLink, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { SupportSection } from '../components/SupportSection';
import { AgentCard } from '../components/AgentCard';
import { Icons } from '../constants';
import { supabase } from '@/src/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkSubscription, openCustomerPortal, createCheckoutSession, SubscriptionStatus } from '@/services/subscriptions';
import { getConnectedAccounts, disconnectAccount, getAppIcon, getAppDisplayName, ComposioConnection, getToolkits, getAllToolkits, ComposioToolkit, connectIntegration, getToolkitFromCache } from '@/services/composio';
import { submitSupportTicket, SUPPORT_TOPICS } from '@/services/support';
import { Search } from 'lucide-react';
type SettingsTab = 'general' | 'billing' | 'integrations' | 'security' | 'support';
type IntegrationsView = 'enabled' | 'browse' | 'detail';
interface AppMetadata {
  id: string;
  name: string;
  icon: string;
  desc: string;
  longDesc: string;
  category: string;
  featured?: boolean;
}
const ALL_POSSIBLE_APPS: AppMetadata[] = [{
  id: 'canva',
  name: 'Canva',
  icon: '🎨',
  desc: 'Design and publish documents.',
  longDesc: 'Canva for Sage helps you transform your ideas into stunning designs seamlessly. Create social posts, flyers, and presentations without leaving the conversation. Access your entire brand kit and thousands of templates directly through Sage.',
  category: 'Featured',
  featured: true
}, {
  id: 'photoshop',
  name: 'Adobe Photoshop',
  icon: '📸',
  desc: 'Edit, stylize, and refine images.',
  longDesc: 'Harness the power of Adobe Photoshop to enhance your images. Sage can now trigger common Photoshop actions like lens blur, background removal, and color correction to keep your visual content looking professional.',
  category: 'Featured',
  featured: true
}, {
  id: 'figma',
  name: 'Figma',
  icon: '📐',
  desc: 'Interface design and prototyping.',
  longDesc: 'Connect Figma to bring your design system into Sage. Sage can fetch specs, search through frames, and post design updates to your team.',
  category: 'Productivity'
}, {
  id: 'github',
  name: 'GitHub',
  icon: '🐙',
  desc: 'Code hosting and collaboration.',
  longDesc: 'Sage monitors pull requests, issues, and repository activity. Ask Sage to summarize recent commits or check the status of a specific build.',
  category: 'Development'
}, {
  id: 'acrobat',
  name: 'Adobe Acrobat',
  icon: '📕',
  desc: 'Edit and organize PDFs easily.',
  longDesc: 'Transform and organize documents seamlessly. Convert PDFs, redact sensitive details, or extract text from scans with OCR. Ideal for professional workflows.',
  category: 'Productivity'
}, {
  id: 'airtable',
  name: 'Airtable',
  icon: '🧱',
  desc: 'Add structured data to Sage.',
  longDesc: 'Link your bases to allow Sage to read and write structured data. Perfect for inventory tracking, CRM management, and project roadmaps.',
  category: 'Productivity'
}, {
  id: 'slack',
  name: 'Slack',
  icon: '💬',
  desc: 'Team communication and chat.',
  longDesc: 'Enable Slack to let Sage send messages, summarize threads, and notify you of urgent pings directly in the workstream.',
  category: 'Communication'
}, {
  id: 'notion',
  name: 'Notion',
  icon: '📓',
  desc: 'Connected workspace for docs.',
  longDesc: 'Index your Notion workspace to give Sage full context on your documentation, notes, and project wikis.',
  category: 'Productivity'
}, {
  id: 'lovable',
  name: 'Lovable',
  icon: '❤️',
  desc: 'Build apps and websites.',
  longDesc: 'The ultimate pairing for Sage. Together they can architect, design, and deploy web applications from simple natural language prompts.',
  category: 'Development'
}];
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse tab from URL hash (e.g., #integrations, #billing)
  const getTabFromHash = (): SettingsTab => {
    const hash = location.hash.replace('#', '');
    const validTabs: SettingsTab[] = ['general', 'billing', 'integrations', 'security', 'support'];
    return validTabs.includes(hash as SettingsTab) ? (hash as SettingsTab) : 'general';
  };
  
  const [activeTab, setActiveTabState] = React.useState<SettingsTab>(getTabFromHash());
  const [integrationView, setIntegrationView] = React.useState<IntegrationsView>('enabled');
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  
  // Update tab state when hash changes (for callback redirects)
  React.useEffect(() => {
    const newTab = getTabFromHash();
    if (newTab !== activeTab) {
      setActiveTabState(newTab);
    }
  }, [location.hash]);
  
  // Flag to track if OAuth callback needs to be handled (checked after loadConnectedAccounts is defined)
  const pendingOAuthCallback = React.useRef<string | null>(null);
  
  // Check for OAuth callback on mount
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get('connected');
    if (connected && location.hash === '#integrations') {
      pendingOAuthCallback.current = connected;
    }
  }, []);
  
  // Custom setActiveTab that also updates URL hash
  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    navigate(`/app/settings#${tab}`, { replace: true });
  };
  const [browseCategory, setBrowseCategory] = React.useState('All');
  const [user, setUser] = React.useState<{
    email: string;
    id?: string;
  } | null>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  const [subscription, setSubscription] = React.useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = React.useState(false);
  const [openingPortal, setOpeningPortal] = React.useState(false);

  // Assistant identity state
  const [assistantIdentity, setAssistantIdentity] = React.useState<{
    id: string;
    email: string | null;
    phone_number: string | null;
  } | null>(null);
  const [loadingAssistantIdentity, setLoadingAssistantIdentity] = React.useState(false);

  // Composio connected accounts state
  const [connectedAccounts, setConnectedAccounts] = React.useState<ComposioConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = React.useState(false);
  const [connectionsError, setConnectionsError] = React.useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null);
  const [disconnectErrorById, setDisconnectErrorById] = React.useState<Record<string, string>>({});
  const [connectingSlug, setConnectingSlug] = React.useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = React.useState(false);
  const [pendingDisconnectId, setPendingDisconnectId] = React.useState<string | null>(null);
  const [pendingDisconnectName, setPendingDisconnectName] = React.useState<string>('');

  // Composio toolkits state
  const [toolkits, setToolkits] = React.useState<ComposioToolkit[]>([]);
  const [filteredToolkits, setFilteredToolkits] = React.useState<ComposioToolkit[]>([]);
  const [loadingToolkits, setLoadingToolkits] = React.useState(false);
  const [toolkitsError, setToolkitsError] = React.useState<string | null>(null);
  const [toolkitSearch, setToolkitSearch] = React.useState('');
  const [toolkitPage, setToolkitPage] = React.useState(1);
  const TOOLKITS_PER_PAGE = 20;
  React.useEffect(() => {
    const loadUser = async () => {
      const {
        data: {
          user: authUser
        }
      } = await supabase.auth.getUser();
      if (authUser) {
        // Load profile from profiles table
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('first_name, last_name, profile_image_url').eq('id', authUser.id).single();
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = not found, which is ok for new users
          console.error('Error loading profile:', error);
        }
        setUser({
          email: authUser.email || '',
          id: authUser.id
        });
        setFirstName(profile?.first_name || '');
        setLastName(profile?.last_name || '');
        setProfileImageUrl(profile?.profile_image_url || null);
      }
    };
    loadUser();
  }, []);

  // Load subscription status
  React.useEffect(() => {
    const loadSubscription = async () => {
      setLoadingSubscription(true);
      try {
        const status = await checkSubscription();
        setSubscription(status);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    loadSubscription();
  }, []);

  // Load assistant identity
  React.useEffect(() => {
    const loadAssistantIdentity = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setLoadingAssistantIdentity(true);
      try {
        const { data, error } = await supabase
          .from('assistant_identity')
          .select('id, email, phone_number')
          .eq('user_id', authUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading assistant identity:', error);
        }
        
        if (data) {
          setAssistantIdentity(data);
        }
      } catch (error) {
        console.error('Error loading assistant identity:', error);
      } finally {
        setLoadingAssistantIdentity(false);
      }
    };
    loadAssistantIdentity();
  }, []);

  // Load connected accounts from Composio
  const loadConnectedAccounts = React.useCallback(async () => {
    setLoadingConnections(true);
    setConnectionsError(null);
    try {
      const response = await getConnectedAccounts();
      setConnectedAccounts(response.connections);
    } catch (error: any) {
      console.error('Error loading connected accounts:', error);
      setConnectionsError(error.message || 'Failed to load connected accounts');
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  // Load toolkits from Composio
  const loadToolkits = React.useCallback(async () => {
    setLoadingToolkits(true);
    setToolkitsError(null);
    try {
      const allToolkits = await getAllToolkits();
      setToolkits(allToolkits);
      setFilteredToolkits(allToolkits);
    } catch (error: any) {
      console.error('Error loading toolkits:', error);
      setToolkitsError(error.message || 'Failed to load integrations');
    } finally {
      setLoadingToolkits(false);
    }
  }, []);
  React.useEffect(() => {
    if (activeTab === 'integrations') {
      loadConnectedAccounts();
      // Preload toolkits in background so they're ready when user opens browse
      if (toolkits.length === 0) {
        loadToolkits();
      }
      
      // Handle OAuth callback if pending
      if (pendingOAuthCallback.current) {
        pendingOAuthCallback.current = null;
        // Clean up the URL
        navigate('/app/settings#integrations', { replace: true });
      }
    }
  }, [activeTab, loadConnectedAccounts, loadToolkits, toolkits.length, navigate]);

  // Filter toolkits based on search and category
  React.useEffect(() => {
    let filtered = toolkits;

    // Filter by search
    if (toolkitSearch) {
      const search = toolkitSearch.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || t.description?.toLowerCase().includes(search) || t.slug.toLowerCase().includes(search));
    }

    // Filter by category (if not 'All')
    if (browseCategory && browseCategory !== 'All') {
      filtered = filtered.filter(t => t.category?.toLowerCase() === browseCategory.toLowerCase());
    }
    setFilteredToolkits(filtered);
    setToolkitPage(1); // Reset to first page on filter change
  }, [toolkitSearch, browseCategory, toolkits]);

  const openDisconnectModal = (connectionId: string, appName: string) => {
    setDisconnectErrorById(prev => ({ ...prev, [connectionId]: '' }));
    setPendingDisconnectId(connectionId);
    setPendingDisconnectName(getAppDisplayName(appName));
    setShowDisconnectModal(true);
  };

  const closeDisconnectModal = () => {
    setShowDisconnectModal(false);
    setPendingDisconnectId(null);
    setPendingDisconnectName('');
  };

  const handleDisconnectAccount = async () => {
    if (!pendingDisconnectId) return;

    const connectionId = pendingDisconnectId;
    closeDisconnectModal();
    setDisconnectingId(connectionId);
    setDisconnectErrorById(prev => ({ ...prev, [connectionId]: '' }));

    try {
      await disconnectAccount(connectionId);
      // Remove from local state
      setConnectedAccounts(prev => prev.filter(c => c.id !== connectionId));
      setMessage({
        type: 'success',
        text: 'Account disconnected successfully'
      });
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      const msg = error.message || 'Failed to disconnect account';
      setDisconnectErrorById(prev => ({ ...prev, [connectionId]: msg }));
      setMessage({
        type: 'error',
        text: msg
      });
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleConnectIntegration = async (toolkitSlug: string) => {
    setConnectingSlug(toolkitSlug);
    setMessage(null);
    try {
      // Use hash-based URL for callback so integrations tab is active on return
      const callbackUrl = `${window.location.origin}/app/settings?connected=${toolkitSlug}#integrations`;
      const result = await connectIntegration(toolkitSlug, callbackUrl);
      
      console.log('Connect integration result:', result);
      
      if (result.redirectUrl) {
        // OAuth flow - redirect the user to authorize
        window.location.href = result.redirectUrl;
      } else if (result.success) {
        // No OAuth needed, connection was created directly
        setMessage({
          type: 'success',
          text: `${getAppDisplayName(toolkitSlug)} connected successfully!`
        });
        // Refresh connected accounts
        loadConnectedAccounts();
        // Go back to connected view
        setIntegrationView('enabled');
      }
    } catch (error: any) {
      console.error('Error connecting integration:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to connect integration'
      });
    } finally {
      setConnectingSlug(null);
    }
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const {
        url
      } = await openCustomerPortal();
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to open subscription management'
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleSubscribe = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to start checkout'
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const sidebarItems: {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
  }[] = [{
    id: 'general',
    label: 'General',
    icon: <Icons.Settings />
  }, {
    id: 'billing',
    label: 'Billing',
    icon: <CreditCard size={18} />
  }, {
    id: 'integrations',
    label: 'Connectors',
    icon: <Cable size={18} />
  }, 
  // Security tab hidden for v0 - uncomment when ready to implement
  // {
  //   id: 'security',
  //   label: 'Security',
  //   icon: <KeyRound size={18} />
  // }, 
  {
    id: 'support',
    label: 'Help & Feedback',
    icon: <HelpCircle size={18} />
  }];
  const renderIntegrationsContent = () => {
    if (integrationView === 'enabled') {
      return <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Connected Accounts</h2>
              <p className="text-sm text-white/40">Apps and services linked to Sage for enhanced functionality.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadConnectedAccounts} disabled={loadingConnections}>
                <RefreshCw size={16} className={loadingConnections ? 'animate-spin' : ''} />
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIntegrationView('browse')}>+ Add More</Button>
            </div>
          </div>

          {loadingConnections && connectedAccounts.length === 0 ? <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div> : connectionsError ? <div className="text-center py-16">
              <p className="text-red-400 mb-4">{connectionsError}</p>
              <Button variant="ghost" size="sm" onClick={loadConnectedAccounts}>
                Try Again
              </Button>
            </div> : connectedAccounts.length === 0 ? <div className="text-center py-16">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Cable className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/60 mb-2">No connected accounts</h3>
              <p className="text-sm text-white/40 mb-6">Connect your favorite apps to supercharge Sage.</p>
              <Button variant="primary" size="sm" onClick={() => setIntegrationView('browse')}>
                Browse Integrations
              </Button>
            </div> : <div className="grid grid-cols-1 gap-4">
              {connectedAccounts.map(connection => {
                // Try to get the toolkit info from cache for proper logo
                const toolkit = getToolkitFromCache(connection.appName);
                return (
                  <div key={connection.id} className="flex items-center justify-between p-6 bg-[#212121] border border-white/5 rounded-[22px] group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white border border-white/10 rounded-2xl flex items-center justify-center text-3xl overflow-hidden">
                        {toolkit?.logo ? (
                          <img 
                            src={toolkit.logo} 
                            alt={toolkit.name} 
                            className="w-9 h-9 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = `<span class="text-3xl">${getAppIcon(connection.appName)}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-3xl">{getAppIcon(connection.appName)}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white/90">{toolkit?.name || getAppDisplayName(connection.appName)}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${connection.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {connection.status}
                          </span>
                          {connection.metadata?.memberName && <span className="text-xs text-white/40">{connection.metadata.memberName}</span>}
                        </div>
                      </div>
                    </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDisconnectModal(connection.id, connection.appName)}
                      disabled={disconnectingId === connection.id}
                    >
                      {disconnectingId === connection.id ? <Loader2 size={14} className="animate-spin" /> : 'Disconnect'}
                    </Button>
                    {!!disconnectErrorById[connection.id] && (
                      <div className="text-[11px] text-red-400 max-w-[240px] text-right">
                        {disconnectErrorById[connection.id]}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>;
    }
    if (integrationView === 'browse') {
      // Get unique categories from toolkits
      const categories = ['All', ...new Set(toolkits.map(t => t.category).filter(Boolean))];

      // Paginate the filtered toolkits
      const totalPages = Math.ceil(filteredToolkits.length / TOOLKITS_PER_PAGE);
      const startIndex = (toolkitPage - 1) * TOOLKITS_PER_PAGE;
      const paginatedToolkits = filteredToolkits.slice(startIndex, startIndex + TOOLKITS_PER_PAGE);
      return <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Connector Store</h2>
              <p className="text-sm text-white/40">
                {loadingToolkits ? 'Loading...' : `${filteredToolkits.length} connectors available`}
              </p>
            </div>
            <button onClick={() => setIntegrationView('enabled')} className="text-xs font-bold text-white/20 hover:text-white transition-colors flex items-center gap-2 uppercase tracking-widest">
              <Icons.ArrowRight className="rotate-180" /> Back to connected
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" placeholder="Search integrations..." value={toolkitSearch} onChange={e => setToolkitSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#212121] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors" />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.slice(0, 10).map(cat => <button key={cat} onClick={() => setBrowseCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${browseCategory === cat ? 'bg-white text-black' : 'bg-[#303030] text-white/40 hover:bg-white/10 hover:text-white/60'}`}>
                {cat}
              </button>)}
          </div>

          {/* Toolkits grid */}
          {loadingToolkits ? <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div> : toolkitsError ? <div className="text-center py-16">
              <p className="text-red-400 mb-4">{toolkitsError}</p>
              <Button variant="ghost" size="sm" onClick={loadToolkits}>
                Try Again
              </Button>
            </div> : filteredToolkits.length === 0 ? <div className="text-center py-16">
              <p className="text-white/40">No integrations found</p>
            </div> : <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedToolkits.map(toolkit => <div key={toolkit.slug} onClick={() => {
              setSelectedAppId(toolkit.slug);
              setIntegrationView('detail');
            }} className="flex items-start gap-4 p-4 bg-[#212121] border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-pointer group">
                    <div className="w-12 h-12 bg-white border border-white/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {toolkit.logo ? <img src={toolkit.logo} alt={toolkit.name} className="w-8 h-8 object-contain" onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl">${getAppIcon(toolkit.slug)}</span>`;
                }} /> : <span className="text-2xl">{getAppIcon(toolkit.slug)}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white/90 group-hover:text-white truncate">
                        {toolkit.name}
                      </div>
                      <div className="text-[11px] text-white/40 line-clamp-2 mt-0.5">
                        {toolkit.description || 'No description available'}
                      </div>
                    </div>
                  </div>)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setToolkitPage(p => Math.max(1, p - 1))} disabled={toolkitPage === 1}>
                    Previous
                  </Button>
                  <span className="text-sm text-white/40 px-4">
                    Page {toolkitPage} of {totalPages}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setToolkitPage(p => Math.min(totalPages, p + 1))} disabled={toolkitPage === totalPages}>
                    Next
                  </Button>
                </div>}
            </>}
        </div>;
    }
    if (integrationView === 'detail' && selectedAppId) {
      // Find in toolkits first, then fall back to static apps
      const toolkit = toolkits.find(t => t.slug === selectedAppId);
      const staticApp = ALL_POSSIBLE_APPS.find(a => a.id === selectedAppId);
      if (!toolkit && !staticApp) {
        return <div className="text-center py-16">
            <p className="text-white/40">Integration not found</p>
            <Button variant="ghost" size="sm" onClick={() => setIntegrationView('browse')} className="mt-4">
              Back to Store
            </Button>
          </div>;
      }
      const name = toolkit?.name || staticApp?.name || '';
      const description = toolkit?.description || staticApp?.longDesc || staticApp?.desc || '';
      const category = toolkit?.category || staticApp?.category || '';
      const logo = toolkit?.logo;
      const authSchemes = toolkit?.authSchemes || [];
      return <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-400">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
            <button onClick={() => setIntegrationView('browse')} className="text-white/20 hover:text-white transition-colors flex items-center gap-1.5">
              <Icons.ArrowRight className="rotate-180 w-3 h-3" />
              Connectors
            </button>
            <span className="text-white/10 font-black">/</span>
            <span className="text-white/40">{name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white border border-white/10 rounded-[28px] flex items-center justify-center overflow-hidden shadow-2xl">
                {logo ? <img src={logo} alt={name} className="w-12 h-12 object-contain" onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<span class="text-4xl">${getAppIcon(selectedAppId)}</span>`;
              }} /> : <span className="text-4xl">{staticApp?.icon || getAppIcon(selectedAppId)}</span>}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{name}</h1>
                
              </div>
            </div>
            <Button 
              variant="primary" 
              className="h-11 px-10"
              onClick={() => handleConnectIntegration(selectedAppId)}
              disabled={connectingSlug === selectedAppId}
            >
              {connectingSlug === selectedAppId ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : 'Connect'}
            </Button>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">About</h3>
            <p className="text-sm text-white/60 leading-relaxed max-w-[800px]">
              {description}
            </p>
          </div>

          <div className="pt-10 border-t border-white/5">
            <div className="grid grid-cols-3 gap-12">
              <div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Category</div>
                <div className="text-xs text-white/60">{category || 'General'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Auth Methods</div>
                <div className="text-xs text-white/60">
                  {authSchemes.length > 0 ? authSchemes.join(', ') : 'OAuth'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Slug</div>
                <div className="text-xs text-white/40 font-mono">{selectedAppId}</div>
              </div>
            </div>
          </div>
        </div>;
    }
  };
  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (!file || !user?.id) return;

          // Validate file type
          if (!file.type.startsWith('image/')) {
            setMessage({
              type: 'error',
              text: 'Please select an image file'
            });
            return;
          }

          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            setMessage({
              type: 'error',
              text: 'Image size must be less than 5MB'
            });
            return;
          }
          setUploadingImage(true);
          setMessage(null);
          try {
            // Get file extension
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/profile.${fileExt}`;

            // Upload to Supabase storage
            // The bucket must exist (created via migration 029) and have proper RLS policies
            const {
              error: uploadError
            } = await supabase.storage.from('profile-images').upload(filePath, file, {
              upsert: true,
              contentType: file.type
            });
            if (uploadError) {
              // Provide helpful error messages based on error type
              if (uploadError.message?.includes('Bucket not found')) {
                throw new Error('Profile images bucket not configured. Please contact support.');
              }
              if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
                throw new Error('Storage policies not configured. Please contact support.');
              }
              throw uploadError;
            }

            // Get public URL
            const {
              data: {
                publicUrl
              }
            } = supabase.storage.from('profile-images').getPublicUrl(filePath);

            // Update profile with image URL
            const {
              error: updateError
            } = await supabase.from('profiles').update({
              profile_image_url: publicUrl
            }).eq('id', user.id);
            if (updateError) throw updateError;
            setProfileImageUrl(publicUrl);
            setMessage({
              type: 'success',
              text: 'Profile image updated successfully'
            });
          } catch (err: any) {
            setMessage({
              type: 'error',
              text: err.message || 'Failed to upload image'
            });
          } finally {
            setUploadingImage(false);
            // Reset input
            event.target.value = '';
          }
        };
        const handleUpdateProfile = async () => {
          if (!user?.id) {
            setMessage({
              type: 'error',
              text: 'User not found'
            });
            return;
          }
          setLoading(true);
          setMessage(null);
          try {
            const {
              error
            } = await supabase.from('profiles').update({
              first_name: firstName || null,
              last_name: lastName || null
            }).eq('id', user.id);
            if (error) throw error;
            setMessage({
              type: 'success',
              text: 'Profile updated successfully'
            });
          } catch (err: any) {
            setMessage({
              type: 'error',
              text: err.message || 'Failed to update profile'
            });
          } finally {
            setLoading(false);
          }
        };

        const handleDeleteAccount = async () => {
          // Verify confirmation text
          if (deleteConfirmationText.toLowerCase() !== 'yes, delete my account') {
            setMessage({
              type: 'error',
              text: 'Please type the confirmation text exactly as shown'
            });
            return;
          }
          setLoading(true);
          try {
            const {
              data: {
                user: authUser
              }
            } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not authenticated');

            // Delete user account via RPC or admin function
            // Note: Supabase doesn't allow users to delete themselves directly
            // You'll need to implement this via a server function or admin API
            await supabase.auth.signOut();
            localStorage.removeItem('gia_user');
            navigate('/');
          } catch (err: any) {
            setMessage({
              type: 'error',
              text: err.message || 'Failed to delete account'
            });
            setLoading(false);
          }
        };
        return <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">General</h2>
              <p className="text-sm text-white/40">Manage your profile and account settings.</p>
            </div>

            {message && <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <p className={`text-xs font-medium ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message.text}
                </p>
              </div>}

            {/* Profile Information */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Profile Information</h3>
              <div className="p-6 bg-[#212121] border border-white/5 rounded-[22px] space-y-6">
                {/* Profile Image */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border border-white/10" /> : <div className="w-20 h-20 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center text-2xl font-bold text-white/40">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>}
                    {uploadingImage && <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </div>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Profile Image</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" id="profile-image-upload" />
                    <label htmlFor="profile-image-upload" className="inline-block px-4 py-2 bg-[#303030] border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:bg-[#3a3a3a] hover:text-white/80 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                    <p className="text-[10px] text-white/20 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">First Name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter your first name" className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter your last name" className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Email Address</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/40 cursor-not-allowed" />
                  <p className="text-[10px] text-white/20 mt-2">Email address cannot be changed</p>
                </div>
                <Button variant="primary" className="w-full h-11" onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </section>

            {/* Agent Identity */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Agent Identity</h3>
              <div className="p-6 bg-[#212121] border border-white/5 rounded-[22px]">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 rounded-[18px] bg-white flex items-center justify-center text-[#0B0B0C] text-2xl font-black shadow-lg flex-shrink-0">
                    G.
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white/90">Sage Core Assistant</p>
                    <p className="text-xs font-mono text-white/40 tracking-wide">
                      ID: {loadingAssistantIdentity ? '...' : assistantIdentity?.id ? assistantIdentity.id.slice(0, 8).toUpperCase() : 'Not available'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-xl">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Agency Email</span>
                    <span className="text-sm font-medium text-white/80">
                      {loadingAssistantIdentity ? '...' : assistantIdentity?.email || 'Not available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-xl">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Direct Line</span>
                    <span className="text-sm font-medium text-white/80">
                      {loadingAssistantIdentity ? '...' : assistantIdentity?.phone_number || 'Not available'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Delete Account */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Danger Zone</h3>
              <div className="p-6 bg-[#212121] border-2 border-red-500/40 rounded-[22px] space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-red-500/90">Delete Account</h4>
                  <p className="text-xs text-white/40 mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                </div>
                <Button variant="secondary" className="w-full h-11 border-red-500/40 text-red-500/70 hover:bg-red-500/10 hover:border-red-500/60" onClick={() => {
                setShowDeleteModal(true);
                setDeleteConfirmationText('');
              }}>
                  Delete Account
                </Button>
              </div>
            </section>

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !loading && setShowDeleteModal(false)} />
                <div className="w-full max-w-[500px] bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                  <button onClick={() => !loading && setShowDeleteModal(false)} disabled={loading} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors disabled:opacity-50">
                    <X size={20} />
                  </button>

                  <div className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="text-red-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-white/90 mb-2">Delete Your Account</h2>
                        <p className="text-sm text-white/60 leading-relaxed">
                          Are you absolutely sure? This action <strong className="text-red-400">cannot be undone</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-xs text-red-400/90 font-medium leading-relaxed">
                          We will permanently delete all of your data including:
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-red-400/70 list-disc list-inside">
                          <li>Your profile and account information</li>
                          <li>All files and documents</li>
                          <li>All apps and projects</li>
                          <li>All session history</li>
                          <li>All other associated data</li>
                        </ul>
                        <p className="mt-3 text-xs text-red-400/90 font-bold">
                          There is no recovering it. This is permanent.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                          Type <span className="text-red-400">"yes, delete my account"</span> to confirm:
                        </label>
                        <input type="text" value={deleteConfirmationText} onChange={e => setDeleteConfirmationText(e.target.value)} placeholder="yes, delete my account" disabled={loading} className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-red-500/50 focus:bg-[#3a3a3a] transition-all disabled:opacity-50 disabled:cursor-not-allowed" autoFocus />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1 h-11" onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmationText('');
                  }} disabled={loading}>
                        Cancel
                      </Button>
                      <Button variant="secondary" className="flex-1 h-11 bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-500/20 hover:border-red-500/60 disabled:opacity-50" onClick={handleDeleteAccount} disabled={loading || deleteConfirmationText.toLowerCase() !== 'yes, delete my account'}>
                        {loading ? 'Deleting Account...' : 'Delete My Account'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>}
          </div>;
      case 'billing':
        const formatDate = (dateStr: string | null) => {
          if (!dateStr) return 'N/A';
          return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        };
        const getStatusBadge = (status: string | null) => {
          if (!status) return null;
        const colors: Record<string, string> = {
          active: 'bg-green-500/20 text-green-400 border-green-500/30',
          trialing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          canceled: 'bg-red-500/20 text-red-400 border-red-500/30',
          past_due: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          unpaid: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
        
        // For trialing status, show countdown timer instead of badge
        if (status === 'trialing' && subscription?.trial_end) {
          return <TrialCountdown trialEnd={subscription.trial_end} />;
        }
        
        return <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || 'bg-white/10 text-white/60 border-white/10'}`}>
            {status.replace('_', ' ')}
          </span>;
      };
      
      // Trial countdown component
      const TrialCountdown: React.FC<{ trialEnd: string }> = ({ trialEnd }) => {
        const [timeLeft, setTimeLeft] = React.useState('');
        
        React.useEffect(() => {
          const calculateTimeLeft = () => {
            const end = new Date(trialEnd).getTime();
            const now = Date.now();
            const diff = end - now;
            
            if (diff <= 0) {
              setTimeLeft('00:00:00');
              return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          };
          
          calculateTimeLeft();
          const interval = setInterval(calculateTimeLeft, 1000);
          return () => clearInterval(interval);
        }, [trialEnd]);
        
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono">
            {timeLeft} left
          </span>
        );
      };
        return <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Account</h2>
              <p className="text-sm text-white/40">Billing, plan details, and subscription management.</p>
            </div>

            {/* Account Info */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Account Information</h3>
              <div className="p-6 bg-[#212121] border border-white/5 rounded-[22px] space-y-4">
                <div className="flex items-center gap-4">
                  {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-14 h-14 rounded-2xl object-cover border border-white/10" /> : <div className="w-14 h-14 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center text-xl font-bold text-white/40">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>}
                  <div>
                    <p className="text-base font-bold text-white/90">
                      {firstName && lastName ? `${firstName} ${lastName}` : user?.email || 'User'}
                    </p>
                    <p className="text-sm text-white/40">{user?.email}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Subscription Status */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Subscription</h3>
              <div className="p-8 bg-[#212121] border border-white/5 rounded-[28px] space-y-8 shadow-xl">
                {loadingSubscription ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                    <span className="ml-3 text-sm text-white/40">Loading subscription...</span>
                  </div> : subscription?.subscribed ? <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">Sage Pro</h3>
                          {getStatusBadge(subscription.status)}
                        </div>
                        <p className="text-sm text-white/40">Full agency access with all premium features.</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$200</div>
                        <div className="text-[10px] uppercase font-bold text-white/20 tracking-widest">Per Month</div>
                      </div>
                    </div>

                    <div>
                      <Button variant="primary" className="h-12 w-full flex items-center justify-center gap-2" onClick={handleManageSubscription} disabled={openingPortal}>
                        {openingPortal ? <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Opening...
                          </> : <>
                            <ExternalLink size={16} />
                            Manage Subscription
                          </>}
                      </Button>
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-4">
                      {subscription.status === 'trialing' && subscription.trial_end && <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">Trial ends</span>
                          <span className="font-bold text-blue-400">{formatDate(subscription.trial_end)}</span>
                        </div>}
                      {subscription.current_period_end && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">
                            {subscription.status === 'trialing' ? 'First billing date' : 'Next billing date'}
                          </span>
                          <span className="font-bold text-white/90">{formatDate(subscription.current_period_end)}</span>
                        </div>
                      )}
                    </div>
                  </> : <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-white/40" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No Active Subscription</h3>
                    <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                      Subscribe to Sage Pro to unlock all premium features and get full agency access.
                    </p>
                    <Button variant="primary" className="h-12 px-8" onClick={handleSubscribe} disabled={openingPortal}>
                      {openingPortal ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Opening Checkout...
                        </>
                      ) : (
                        'Subscribe Now'
                      )}
                    </Button>
                  </div>}
              </div>
            </section>
          </div>;
      case 'integrations':
        return <>
          {renderIntegrationsContent()}
          
          {/* Disconnect Confirmation Modal */}
          {showDisconnectModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDisconnectModal} />
              <div className="w-full max-w-[420px] bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                <button onClick={closeDisconnectModal} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors">
                  <X size={20} />
                </button>

                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <AlertTriangle className="text-orange-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-white/90 mb-2">Disconnect {pendingDisconnectName}?</h2>
                      <p className="text-sm text-white/60 leading-relaxed">
                        This will remove the connection to <strong className="text-white/80">{pendingDisconnectName}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-6">
                    <p className="text-xs text-orange-400/90 font-medium leading-relaxed">
                      What happens when you disconnect:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-orange-400/70 list-disc list-inside">
                      <li>Sage will no longer be able to access this account</li>
                      <li>Any active automations using this connection will stop</li>
                      <li>You can reconnect at any time</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1 h-11" onClick={closeDisconnectModal}>
                      Cancel
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-11 bg-orange-500/10 border-orange-500/40 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500/60" 
                      onClick={handleDisconnectAccount}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>;
      case 'security':
        return <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white tracking-tight">Security</h2>
              <p className="text-sm text-white/40 mt-2 font-medium">Protect your agency and data.</p>
            </div>

            <section className="space-y-5">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest pl-1">Authentication</h3>
              <div className="p-1 bg-white/[0.03] border border-white/5 rounded-[24px]">
                <div className="px-6 py-5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] rounded-[20px] transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-white/90 mb-1">Passkeys</h4>
                    <p className="text-[13px] text-white/40 font-medium leading-relaxed">Passkeys are secure and protect your account with biometrics.</p>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8 px-4 text-xs font-bold border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20">Add Key</Button>
                </div>

                <div className="mx-6 h-px bg-[#303030]" />

                <div className="px-6 py-5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] rounded-[20px] transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-white/90 mb-1">Multi-factor Authentication (MFA)</h4>
                    <p className="text-[13px] text-white/40 font-medium leading-relaxed">Use an authenticator app for an extra layer of security.</p>
                  </div>
                  <div className="w-11 h-6 bg-[#303030] border border-white/10 rounded-full relative cursor-pointer transition-colors hover:border-white/20">
                    <div className="absolute top-[3px] left-[3px] w-[16px] h-[16px] bg-white/20 rounded-full transition-all group-hover:bg-white/30" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-5 pt-6">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest pl-1">Sessions</h3>
              <div className="p-1 bg-white/[0.03] border border-white/5 rounded-[24px]">
                <div className="px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] rounded-[20px] transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-white/90 mb-1">Log out of this device</h4>
                    <p className="text-[13px] text-white/40 font-medium leading-relaxed">End your current session safely.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-4 text-xs font-bold text-white/40 hover:text-white hover:bg-[#303030]">Log Out</Button>
                </div>
              </div>
            </section>
          </div>;
      case 'support':
        return <SupportSection user={user} firstName={firstName} lastName={lastName} />;
      default:
        return null;
    }
  };

  return <div className="flex flex-col items-center justify-center min-h-[80vh] py-12 px-6">
      <div className="w-[1000px] flex rounded-[40px] shadow-2xl animate-in fade-in duration-700 h-[720px] overflow-hidden bg-[#212121] border border-white/5">
        {/* Unified Sidebar Rail */}
        <aside className="w-[280px] border-r border-white/5 p-10 flex flex-col relative">
          <div className="mb-14 px-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          </div>

          <nav className="flex-1 space-y-3">
            {sidebarItems.map(item => <button key={item.id} onClick={() => {
            setActiveTab(item.id);
            if (item.id === 'integrations') setIntegrationView('enabled');
          }} className={`w-full group flex items-center gap-4 h-10 px-4 rounded-xl text-sm font-medium transition-all relative ${activeTab === item.id ? 'text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'}`}>
                {/* Visual indicator for active tab - Pill style */}
                {activeTab === item.id && <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />}
                <div className={`transition-colors duration-300 ${activeTab === item.id ? 'text-white scale-100' : 'text-white/20 group-hover:text-white/40 scale-95'}`}>
                  {item.icon}
                </div>
                {item.label}
              </button>)}
          </nav>

          {/* User Account Info - Unified Quiet Footer */}
          <div className="mt-auto pt-10">
            <div className="flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity group cursor-default">
              {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-11 h-11 rounded-2xl object-cover border border-white/10 group-hover:border-white/20 transition-all" /> : <div className="w-11 h-11 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center text-sm font-bold text-white/40 group-hover:border-white/20 transition-all">
                  {user?.email?.charAt(0).toUpperCase() || 'D'}
                </div>}
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white/90 truncate leading-none mb-1">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Account'}
                </p>
                <p className="text-[11px] text-white/30 truncate font-medium">{user?.email || 'demo@sage.agency'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Integrated Content Area */}
        <main className="flex-1 overflow-y-auto p-12 flex flex-col">
          <div className="max-w-[800px] mx-auto w-full flex-1 flex flex-col">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>;
};
export default Settings;
