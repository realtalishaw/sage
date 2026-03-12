import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../constants';
import { mockAgents } from '../data/agents';

const Agents: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const navigate = useNavigate();

  const openAgentProfile = (agentId: string) => {
    const nextPath = `/app/agents/${agentId}`;
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition.call(transitionDocument, () => navigate(nextPath));
      return;
    }

    navigate(nextPath);
  };

  const filteredAgents = mockAgents.filter((agent) => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return true;
    }

    return (
      agent.name.toLowerCase().includes(query) ||
      agent.title.toLowerCase().includes(query) ||
      agent.skills.some((skill) => skill.toLowerCase().includes(query)) ||
      agent.tools.some((tool) => tool.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-20 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col items-center gap-8 max-w-[800px] mx-auto w-full pt-16">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-white/30 uppercase tracking-[0.2em] font-bold">Your Sage specialists</p>
        </div>

        <div className="relative w-full shadow-2xl">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30">
            <Icons.Search />
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agents, skills, or tools..."
            className="w-full bg-[#303030] border border-white/10 h-16 pl-16 pr-4 rounded-[22px] text-[16px] focus:outline-none focus:bg-[#3a3a3a] focus:border-white/20 transition-all placeholder:text-white/20 shadow-inner"
          />
        </div>
      </div>

      <section className="mx-auto max-w-[1280px]">
        {filteredAgents.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-[#212121] px-6 py-16 text-center text-white/40">
            No agents found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4 justify-items-center">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="w-full max-w-[315px] rounded-[28px] border border-white/10 bg-[#212121] shadow-2xl overflow-hidden transition-all hover:border-white/20 hover:bg-[#262626]"
              >
                <div className="h-28 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] border-b border-white/5" />
                <div className="-mt-10 px-[18px] pb-[22px] text-center">
                  <div
                    className="relative mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full border-[5px] border-[#212121] bg-white text-[28px] font-black text-[#0B0B0C] shadow-lg"
                    style={{ viewTransitionName: `agent-avatar-${agent.id}` }}
                  >
                    {agent.avatar}
                    <span
                      className={`absolute right-0.5 top-0.5 inline-flex w-3.5 h-3.5 rounded-full border-2 border-[#212121] ${
                        agent.status === 'online'
                          ? 'bg-emerald-400'
                          : agent.status === 'busy'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                  </div>

                  <div className="mt-4 min-h-[64px]">
                    <div className="text-[19px] font-semibold leading-tight text-white/90">{agent.name}</div>
                    <div className="mt-1 text-[15px] leading-relaxed text-white/45">{agent.title}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAgentProfile(agent.id)}
                    className="mt-5 inline-flex h-10 min-w-[140px] items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#0B0B0C] transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Agents;
