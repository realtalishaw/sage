
import React, { useEffect, useState } from 'react';
import { ChevronDown, Send, Zap, Loader2 } from 'lucide-react';
import { Icons } from '../constants';
import { Button } from '../components/Button';
import { GIAApp, GIAFlow, FlowRun } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/integrations/supabase/client';

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

// Helper to get category from app metadata or name
const getAppCategory = (app: DatabaseApp): string => {
  if (app.metadata && typeof app.metadata === 'object' && app.metadata !== null && 'category' in app.metadata) {
    return String((app.metadata as Record<string, unknown>).category);
  }
  return 'Custom';
};

const MOCK_FLOWS: GIAFlow[] = [
  {
    id: 'flow1',
    name: 'Daily Executive Alignment Digest',
    description: 'Pull today\'s calendar events and identify meetings with external attendees. For each meeting, look up relevant context from your data sources including status, ownership, and open tasks. Summarize risks, open questions, and recommended talking points. Compile everything into a single email with sections for schedule, key items to watch, and action reminders.',
    trigger: 'Weekdays at 7:00 AM',
    status: 'auto',
    integrations: ['Calendar', 'Gmail', 'Sheets', 'Slack'],
    nextRun: '7:00 AM Jan 13',
    history: [
      { id: 'r1', status: 'completed', timestamp: '7:00 AM Jan 12', logs: ['Gathering meetings...', 'Generating briefing...', 'Sent to Slack'] },
      { id: 'r2', status: 'completed', timestamp: '7:00 AM Jan 11', logs: ['Gathering meetings...', 'Sent to Slack'] },
    ]
  },
  {
    id: 'flow2',
    name: 'Investor Sentiment Pulse',
    description: 'Use web search to gather major funding, acquisition, or competitive headlines relevant to your sector from the past week. Pull your fundraising or investor tracker to surface status changes, new notes, or overdue follow-ups. Draft a concise email update to relevant stakeholders summarizing key headlines, updates, and recommended next steps.',
    trigger: 'Weekly, Sundays at 8:00 AM',
    status: 'manual',
    integrations: ['Search', 'Gmail', 'Sheets'],
    nextRun: '8:00 AM Jan 19',
    history: [
      { id: 'r3', status: 'completed', timestamp: '8:00 AM Jan 12', logs: ['Search triggered', 'Found 12 articles', 'Draft saved to Gmail'] },
    ]
  },
  {
    id: 'flow3',
    name: 'Meeting Prep Snapshot',
    description: 'Identify the most strategic meeting on the calendar today based on external attendees or meeting importance indicators. Pull recent notes or documentation related to that meeting. Draft a summary with agenda, latest updates, and preparation items. Send the summary via email and (if using Slack), post it to a specific channel.',
    trigger: 'Daily at 6:30 AM',
    status: 'auto',
    integrations: ['Calendar', 'Gmail', 'Slack'],
    nextRun: '6:30 AM Jan 13',
    history: [
      { id: 'r4', status: 'completed', timestamp: '6:30 AM Jan 12', logs: ['Analyzing calendar...', 'Found Board Prep meeting', 'Briefing posted'] },
    ]
  }
];

const IntegrationIcon = ({ name, showName = false }: { name: string, showName?: boolean }) => {
  const colors: Record<string, string> = {
    'Gmail': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Calendar': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Sheets': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Slack': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Search': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Notion': 'bg-black/20 text-white/60 border-white/10',
  };

  const colorClass = colors[name] || 'bg-[#303030] text-white/40 border-white/10';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border ${colorClass}`} title={name}>
        {name.charAt(0)}
      </div>
      {showName && <span className="text-xs font-bold text-white/60">{name}</span>}
    </div>
  );
};

const Apps: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = React.useState<'main' | 'flow-detail'>('main');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  
  // Real apps from database
  const [apps, setApps] = useState<DatabaseApp[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch apps from database
  useEffect(() => {
    async function fetchApps() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('apps')
          .select('id, app_name, app_slug, description, status, metadata, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching apps:', error);
        } else {
          setApps(data || []);
        }
      } catch (err) {
        console.error('Error fetching apps:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, []);

  const activeFlow = MOCK_FLOWS.find(f => f.id === selectedId);

  const filteredApps = apps
    .filter(a => a.app_name.toLowerCase().includes(search.toLowerCase()));

  const handleAppClick = (appId: string) => {
    navigate(`/app/apps/${appId}`);
  };

  if (view === 'flow-detail' && activeFlow) {
    return (
      <div className="flex h-[calc(100vh-80px)] -mt-10 -mx-10 animate-in fade-in duration-300">
        {/* Left Side: History (Complete Logs) */}
        <div className="w-[320px] bg-[#0b0b0b] border-r border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <button onClick={() => setView('main')} className="text-white/40 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6">
              <ChevronDown size={14} strokeWidth={2.5} className="rotate-90" />
              Back to Apps
            </button>
            <h2 className="text-lg font-bold">Flow Logs</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeFlow.history.map(run => (
              <div key={run.id} className="p-4 rounded-xl hover:bg-[#303030] transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[13px] font-bold text-white/90">Run Complete</span>
                </div>
                <div className="text-[11px] text-white/30 font-medium ml-5 mb-3">{run.timestamp}</div>
                <div className="ml-5 space-y-1.5">
                   {run.logs.map((log, idx) => (
                     <div key={idx} className="text-[10px] text-white/20 font-mono leading-tight">{log}</div>
                   ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Flow Detail & Chat */}
        <div className="flex-1 bg-[#0b0b0b] flex flex-col relative">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#212121]">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{activeFlow.name}</h1>
                <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">Active</div>
              </div>
            </div>
            <div className="flex bg-[#212121] p-1 rounded-xl border border-white/5">
              {['Disabled', 'Always Ask', 'Auto'].map(status => (
                <button 
                  key={status}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFlow.status === status.toLowerCase() ? 'bg-white text-[#0B0B0C] shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12">
            <div className="max-w-[760px] mx-auto space-y-12 pb-32">
              <div className="grid grid-cols-2 gap-12">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Trigger</h3>
                  <div className="p-4 bg-[#212121] border border-white/5 rounded-2xl">
                    <div className="text-sm font-bold text-white/90">{activeFlow.trigger}</div>
                    <div className="text-[11px] text-white/20 mt-1 uppercase tracking-wider font-bold">Recurring • Next: {activeFlow.nextRun}</div>
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Integrations</h3>
                  <div className="flex flex-wrap gap-4">
                    {activeFlow.integrations.map(integration => (
                      <IntegrationIcon key={integration} name={integration} showName />
                    ))}
                  </div>
                </section>
              </div>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Plan / Description</h3>
                <div className="p-6 bg-[#212121] border border-white/5 rounded-2xl">
                  <p className="text-sm text-white/50 leading-relaxed">
                    {activeFlow.description}
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Edit with Sage Chat - Flush Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b] to-transparent">
            <div className="max-w-[700px] mx-auto relative group bg-[#212121] rounded-2xl border border-white/5 p-4 flex items-center shadow-2xl">
              <textarea 
                rows={1}
                placeholder="Ask Sage to modify this flow..."
                className="flex-1 bg-transparent text-[15px] focus:outline-none placeholder:text-white/10 resize-none py-2"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button className="shrink-0 p-2 text-white/20 hover:text-white transition-colors ml-4">
                 <Send size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-20 animate-in fade-in duration-500 pb-20">

      {/* Header & Search */}
      <div className="flex flex-col items-center gap-8 max-w-[800px] mx-auto w-full pt-16">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Apps & Automations</h1>
          <p className="text-sm text-white/30 uppercase tracking-[0.2em] font-bold">Supercharge your workflows</p>
        </div>
        
        <div className="relative w-full shadow-2xl">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30">
            <Icons.Search />
          </div>
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations or automations..."
            className="w-full bg-[#303030] border border-white/10 h-16 pl-16 pr-4 rounded-[22px] text-[16px] focus:outline-none focus:bg-[#3a3a3a] focus:border-white/20 transition-all placeholder:text-white/20 shadow-inner"
          />
        </div>
      </div>

      {/* Top Apps Grid */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">Apps</h2>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredApps.map(app => (
              <div 
                key={app.id} 
                onClick={() => handleAppClick(app.id)}
                className="group flex flex-col items-center gap-4 cursor-pointer"
              >
                <div className="w-24 h-24 bg-[#212121] border border-white/5 rounded-[32px] flex items-center justify-center text-4xl shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-white/20 group-hover:bg-[#303030] relative">
                  {getAppIcon(app)}
                </div>
                <div className="text-center min-w-0">
                  <div className="text-sm font-bold text-white/90 group-hover:text-white transition-colors truncate">{app.app_name}</div>
                  <div className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-0.5">{getAppCategory(app)}</div>
                </div>
              </div>
            ))}
            {filteredApps.length === 0 && !loading && (
              <div className="col-span-full text-center py-8 text-white/40">
                <p className="text-sm">No apps found.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bottom Flows List */}
      <section className="space-y-8 pt-12 border-t border-white/5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">Active Flows</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_FLOWS.map(flow => (
            <div 
              key={flow.id} 
              onClick={() => { setSelectedId(flow.id); setView('flow-detail'); }}
              className="group relative p-6 bg-[#212121] border border-white/5 rounded-[28px] hover:border-white/20 transition-all cursor-pointer overflow-hidden shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#303030] flex items-center justify-center text-white/40">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90 group-hover:text-white">{flow.name}</h3>
                    <div className="flex gap-2.5 mt-2">
                      {flow.integrations.map(int => (
                        <IntegrationIcon key={int} name={int} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${flow.status === 'auto' ? 'bg-green-500/10 text-green-500' : 'bg-white/10 text-white/40'}`}>
                  {flow.status}
                </div>
              </div>
              <p className="text-xs text-white/30 leading-relaxed mb-6 line-clamp-2">{flow.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                <div className="text-[11px] text-white/20 font-medium">Next run: <span className="text-white/40">{flow.nextRun}</span></div>
                <Icons.ArrowRight />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Apps;
