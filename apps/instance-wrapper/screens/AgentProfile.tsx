import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { mockAgents } from '../data/agents';

const statusStyles = {
  online: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  busy: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  offline: 'bg-white/10 text-white/40 border-white/10',
} as const;

const AgentProfile: React.FC = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((entry) => entry.id === agentId);

  if (!agent) {
    return <Navigate to="/app/agents" replace />;
  }

  const goBackToAgents = () => {
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition.call(transitionDocument, () => navigate('/app/agents'));
      return;
    }

    navigate('/app/agents');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-16">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBackToAgents}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          Back to agents
        </button>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#212121] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-[24px] bg-white text-[#0B0B0C] flex items-center justify-center font-black text-2xl shadow-lg"
                style={{ viewTransitionName: `agent-avatar-${agent.id}` }}
              >
                {agent.avatar}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
                <p className="text-sm text-white/45 mt-2">{agent.title}</p>
              </div>
            </div>
            <span
              className={`self-start px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${statusStyles[agent.status]}`}
            >
              {agent.status}
            </span>
          </div>
          <p className="mt-6 max-w-[760px] text-sm text-white/60 leading-relaxed">{agent.bio}</p>
        </div>

        <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {agent.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Tools</h2>
            <div className="flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
                >
                  {tool}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Tasks</h2>
            <div className="space-y-2">
              {agent.activeTasks.map((task) => (
                <div
                  key={task}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75"
                >
                  {task}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="px-8 pb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Workstream / Logs</h2>
          <div className="space-y-3">
            {agent.logs.map((log) => (
              <div
                key={log.id}
                className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-2 h-2 rounded-full bg-white/25" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">{log.timestamp}</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AgentProfile;
