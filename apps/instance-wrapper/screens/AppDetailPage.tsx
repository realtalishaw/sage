import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, RefreshCw, Loader2, X } from 'lucide-react';
import { supabase } from '../src/integrations/supabase/client';
import { getSandboxUrl, refreshSandbox, SandboxResponse } from '../services/sandbox';
import { getCurrentInstanceAccess } from '../services/instanceAccess';

interface DatabaseApp {
  id: string;
  app_name: string;
  app_slug: string;
  description: string | null;
  status: string;
  metadata: unknown;
  created_at: string;
}

// Helper to get icon from app name or metadata
const getAppIcon = (app: DatabaseApp): string => {
  const iconMap: Record<string, string> = {
    'gmail': '✉️',
    'calendar': '📅',
    'slack': '💬',
    'sheets': '📊',
    'notion': '📓',
    'zapier': '⚡',
    'zoom': '📹',
  };
  const slug = app.app_slug.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (slug.includes(key)) return icon;
  }
  return '📱';
};

const AppDetailPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<DatabaseApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [sandboxLoading, setSandboxLoading] = useState(true);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Fetch app data
  useEffect(() => {
    async function fetchApp() {
      if (!appId) {
        setError('App ID is required');
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        const instance = await getCurrentInstanceAccess();

        const { data, error: fetchError } = await supabase
          .from('apps')
          .select('id, app_name, app_slug, description, status, metadata, created_at')
          .eq('instance_id', instance.instanceId)
          .eq('id', appId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !data) {
          setError('App not found');
          setLoading(false);
          return;
        }

        setApp(data);
        setLoading(false);

        // Get sandbox URL
        try {
          setSandboxLoading(true);
          const sandboxData: SandboxResponse = await getSandboxUrl(appId);
          setSandboxUrl(sandboxData.url);
          setError(null);
        } catch (sandboxError: any) {
          console.error('Error getting sandbox URL:', sandboxError);
          setError(sandboxError.message || 'Failed to load sandbox');
        } finally {
          setSandboxLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching app:', err);
        setError(err.message || 'Failed to load app');
        setLoading(false);
      }
    }

    fetchApp();
  }, [appId]);

  const handleRefresh = async () => {
    if (!appId) return;

    try {
      setSandboxLoading(true);
      setError(null);
      setSandboxUrl(null);
      
      // Force refresh by clearing and recreating sandbox
      const sandboxData: SandboxResponse = await refreshSandbox(appId);
      setSandboxUrl(sandboxData.url);
      
      // Force iframe reload
      setIframeKey(prev => prev + 1);
    } catch (err: any) {
      console.error('Error refreshing sandbox:', err);
      setError(err.message || 'Failed to refresh sandbox');
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/app/apps');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mb-10 animate-in fade-in duration-300 bg-[#0b0b0b]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            <p className="text-sm text-white/40">Loading app...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !sandboxLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mb-10 animate-in fade-in duration-300 bg-[#0b0b0b]">
        <div className="p-6 border-b border-white/5 bg-[#212121]/50 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleClose} 
              className="text-white/40 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            >
              <ChevronDown size={14} strokeWidth={2.5} className="rotate-90" />
              Close
            </button>
            {app && (
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getAppIcon(app)}</span>
                <h1 className="text-xl font-bold">{app.app_name}</h1>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 mx-auto">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Failed to Load Sandbox</h2>
            <p className="text-white/40 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mb-10 animate-in fade-in duration-300 bg-[#0b0b0b]">
      {/* Thin Header */}
      <div className="h-16 border-b border-white/5 bg-[#212121]/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleClose} 
            className="text-white/40 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <ChevronDown size={14} strokeWidth={2.5} className="rotate-90" />
            Close
          </button>
          {app && (
            <div className="flex items-center gap-4">
              <span className="text-2xl">{getAppIcon(app)}</span>
              <h1 className="text-xl font-bold">{app.app_name}</h1>
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={sandboxLoading}
          className="text-white/40 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sandboxLoading ? (
            <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
          ) : (
            <RefreshCw size={14} strokeWidth={2.5} />
          )}
          Refresh
        </button>
      </div>

      {/* Main Content - iframe or loading state */}
      <div className="flex-1 relative overflow-hidden">
        {sandboxLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0b]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              <p className="text-sm text-white/40">Starting sandbox...</p>
              <p className="text-xs text-white/20 mt-2">This may take a few moments</p>
            </div>
          </div>
        ) : sandboxUrl ? (
          <iframe
            key={iframeKey}
            src={sandboxUrl}
            className="w-full h-full border-0"
            title={app?.app_name || 'App Sandbox'}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; wake-lock; xr-spatial-tracking"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            onLoad={() => {
              console.log('Iframe loaded successfully');
            }}
            onError={() => {
              setError('Failed to load sandbox content');
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0b]">
            <div className="text-center">
              <p className="text-sm text-white/40">No sandbox URL available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDetailPage;
