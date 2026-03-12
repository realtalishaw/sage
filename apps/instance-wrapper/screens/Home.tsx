import React from 'react';
import { Workstream } from '../components/Workstream';
import { WorkstreamItem } from '../types';
import { sendChatMessage } from '../services/fastChat';
import { useWorkstreamRealtime } from '../hooks/useWorkstreamRealtime';
import { mockAgents } from '../data/agents';

const Home: React.FC = () => {
  const {
    items: realtimeItems,
    loading: workstreamLoading,
    hasMore,
    loadingMore,
    loadMore,
    sendMessage: sendWorkstreamMessage,
    sendAgentMessage: sendWorkstreamAgentMessage,
    addReaction
  } = useWorkstreamRealtime();

  const [localItems, setLocalItems] = React.useState<WorkstreamItem[]>([]);
  const [isAiTyping, setIsAiTyping] = React.useState(false);
  const [openThreadId, setOpenThreadId] = React.useState<string | null>(null);
  // Store a conversation_id for the entire workstream session
  const [conversationId] = React.useState<string>(() => {
    // Generate a conversation ID once on mount
    return `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });

  // Combine realtime items with local items (for optimistic updates)
  const items = React.useMemo(() => {
    // Keep all local items (they have 'local-' prefix)
    // Also keep any non-local items that aren't already in realtime
    const realtimeIds = new Set(realtimeItems.map(i => i.id));
    const uniqueLocalItems = localItems.filter(i => 
      i.id.startsWith('local-') || !realtimeIds.has(i.id)
    );
    return [...realtimeItems, ...uniqueLocalItems];
  }, [realtimeItems, localItems]);

  const handleSendMessage = async (msg: string, replyToId?: string) => {
    console.log('[Home] Sending message:', msg, 'replyToId:', replyToId);
    
    // Add optimistic local item for immediate feedback
    const localId = `local-${Date.now()}`;
    const userItem: WorkstreamItem = {
      id: localId,
      author: { name: 'You', isAi: false },
      type: 'user_message',
      content: msg,
      timestamp: new Date(),
      metadata: {
        replyToId: replyToId
      }
    };
    setLocalItems(prev => [...prev, userItem]);
    console.log('[Home] Added optimistic user item:', localId);

    // Determine which conversation ID to use for database storage
    // If in a thread, use thread parent as conversation ID for proper context loading
    const dbConversationId = replyToId ? replyToId : conversationId;

    // Send to database via realtime hook and get the actual DB ID
    const { success, error: sendError, id: savedMessageId } = await sendWorkstreamMessage(msg, replyToId, dbConversationId);

    // If we got a DB id, rewrite the optimistic item's id so threads/reactions work immediately
    if (savedMessageId) {
      setLocalItems(prev => prev.map(i => (i.id === localId ? { ...i, id: savedMessageId } : i)));
    }

    // Determine the thread parent ID and which thread to open
    // If we're replying in a thread (replyToId exists), that's the parent for ALL replies in this thread
    // Otherwise, this message becomes the new parent
    const threadParentId = replyToId || savedMessageId || localId;

    if (!success) {
      console.error('[Home] Error sending message to DB:', sendError);
    } else {
      console.log('[Home] Message sent to DB successfully with ID:', savedMessageId);
      console.log('[Home] Thread parent ID:', threadParentId, 'Is reply:', !!replyToId);
    }

    // Also trigger the AI response via fast chat
    setIsAiTyping(true);
    // Open thread immediately when AI starts typing
    setOpenThreadId(threadParentId);
    console.log('[Home] Starting AI typing indicator, opened thread:', threadParentId);

    try {
      // Determine which conversation ID to use:
      // - If in a thread (replyToId exists), use threadParentId as conversation ID
      //   so the API only sees messages from this thread
      // - Otherwise use the global conversationId
      const apiConversationId = replyToId ? threadParentId : conversationId;
      console.log('[Home] Calling Sage API with conversation:', apiConversationId, 'isThread:', !!replyToId);

      let fullResponse = '';
      let streamingMessageId: string | null = null;

      const response = await sendChatMessage(
        msg,
        'chat',
        apiConversationId,
        (chunk: string) => {
          // Update the streaming message with each chunk
          fullResponse += chunk;
          console.log('[Home] Received chunk, total length:', fullResponse.length);

          // Create streaming message on first chunk
          if (!streamingMessageId) {
            console.log('[Home] Creating streaming message for first chunk');
            streamingMessageId = `local-streaming-${Date.now()}`;
            const streamingMessage: WorkstreamItem = {
              id: streamingMessageId,
              author: { name: 'Sage Agent', isAi: true },
              type: 'agent_message',
              content: chunk,
              timestamp: new Date(),
              metadata: {
                replyToId: threadParentId
              }
            };
            setLocalItems(prev => [...prev, streamingMessage]);
            // Turn off typing indicator once first chunk arrives
            setIsAiTyping(false);
          } else {
            // Update existing streaming message
            console.log('[Home] Updating streaming message, new length:', fullResponse.length);
            setLocalItems(prev =>
              prev.map(item =>
                item.id === streamingMessageId
                  ? { ...item, content: fullResponse }
                  : item
              )
            );
          }
        }
      );

      console.log('[Home] Sage API response complete:', response?.substring(0, 100) + '...');

      // Save AI response to database with the thread parent ID and conversation ID
      // All replies in a thread should point to the same parent
      if (response) {
        const { success: agentSuccess, error: agentError, id: savedAgentId } = await sendWorkstreamAgentMessage(response, threadParentId, apiConversationId);

        if (agentSuccess) {
          console.log('[Home] Agent response saved to DB with ID:', savedAgentId, 'thread parent:', threadParentId);

          // Replace the streaming message with the DB-saved version (if it exists)
          if (streamingMessageId) {
            setLocalItems(prev =>
              prev.map(item =>
                item.id === streamingMessageId
                  ? {
                      ...item,
                      id: savedAgentId || streamingMessageId,
                      content: response
                    }
                  : item
              )
            );
          } else {
            // If no streaming happened, add the message now
            const agentItem: WorkstreamItem = {
              id: savedAgentId || `local-agent-${Date.now()}`,
              author: { name: 'Sage Agent', isAi: true },
              type: 'agent_message',
              content: response,
              timestamp: new Date(),
              metadata: {
                replyToId: threadParentId
              }
            };
            setLocalItems(prev => [...prev, agentItem]);
          }
        } else {
          console.error('[Home] Failed to save agent response:', agentError);
          // Keep the streaming message with its content, or create it if it doesn't exist
          if (!streamingMessageId) {
            const agentLocalId = `local-agent-${Date.now()}`;
            const agentItem: WorkstreamItem = {
              id: agentLocalId,
              author: { name: 'Sage Agent', isAi: true },
              type: 'agent_message',
              content: response,
              timestamp: new Date(),
              metadata: {
                replyToId: threadParentId
              }
            };
            setLocalItems(prev => [...prev, agentItem]);
          }
        }
      }
    } catch (error) {
      console.error('[Home] Error getting AI response:', error);
      // Replace streaming message with error message, or create error message if streaming never started
      const errorMessage = error instanceof Error
        ? `Sorry, I encountered an error: ${error.message}`
        : "Sorry, I encountered an error. Please try again.";

      if (streamingMessageId) {
        // Update existing streaming message with error
        setLocalItems(prev =>
          prev.map(item =>
            item.id === streamingMessageId
              ? { ...item, content: errorMessage }
              : item
          )
        );
      } else {
        // Create error message
        const errorItem: WorkstreamItem = {
          id: `local-error-${Date.now()}`,
          author: { name: 'Sage Agent', isAi: true },
          type: 'agent_message',
          content: errorMessage,
          timestamp: new Date(),
          metadata: {
            replyToId: threadParentId
          }
        };
        setLocalItems(prev => [...prev, errorItem]);
      }
    } finally {
      setIsAiTyping(false);
      console.log('[Home] AI typing indicator stopped');
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Skip reactions on optimistic (non-UUID) items
    if (messageId.startsWith('local-')) return;
    await addReaction(messageId, emoji);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Home</h1>
            <p className="text-sm text-white/40 mt-1">Your day at a glance.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 h-[calc(100vh-200px)] min-h-[400px]">
          <Workstream
            items={items}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
            isTyping={isAiTyping}
            openThreadId={openThreadId}
            onThreadChange={setOpenThreadId}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        </div>

        <div className="lg:col-span-4 h-[calc(100vh-200px)] min-h-[400px] flex flex-col gap-3">
          <div className="w-full h-full bg-[#212121] border border-white/5 rounded-[20px] overflow-hidden shadow-lg flex flex-col">
            <div className="flex items-start justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white/90">Online now</h3>
                <p className="text-[11px] text-white/40 mt-1">Active agents ready to run specialized work.</p>
              </div>
              <span className="text-[11px] text-white/30">{mockAgents.filter((agent) => agent.status === 'online').length} online</span>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {mockAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#0B0B0C] flex items-center justify-center font-black text-sm shadow-lg">
                        {agent.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90 truncate">{agent.name}</div>
                        <div className="text-xs text-white/45 truncate">{agent.title}</div>
                      </div>
                    </div>
                    <span
                      className={`mt-1 inline-flex w-2.5 h-2.5 rounded-full ${
                        agent.status === 'online'
                          ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                          : agent.status === 'busy'
                          ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                          : 'bg-white/20'
                      }`}
                    />
                  </div>

                  <div className="mt-4">
                    {agent.status === 'online' ? (
                      <>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25 mb-2">Current task</div>
                        <div className="text-sm text-white/75 rounded-2xl bg-white/[0.03] border border-white/10 px-3 py-3">
                          {agent.activeTasks[0]}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25 mb-2">Status</div>
                        <div className="text-sm text-amber-300 rounded-2xl bg-amber-500/[0.08] border border-amber-500/15 px-3 py-3">
                          Idle now
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
