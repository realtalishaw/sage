
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Reply, MessageSquare, ChevronLeft, X, Send } from 'lucide-react';
import { WorkstreamItem, Reaction } from '../types';
import { THEME, Icons } from '../constants';

interface WorkstreamProps {
  items: WorkstreamItem[];
  onSendMessage: (msg: string, replyToId?: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  isTyping?: boolean;
  openThreadId?: string | null;
  onThreadChange?: (threadId: string | null) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <div className="group relative flex flex-col px-2">
    <div className="group/msg relative flex gap-4 p-4 transition-colors rounded-xl hover:bg-white/[0.02]">
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        <div className="rounded-[20px] bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg w-9 h-9 text-[12px]">
          G.
        </div>
      </div>

      {/* Typing dots */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white">Sage Agent</span>
          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/30 font-bold uppercase tracking-wider">Agent</span>
        </div>
        <div className="flex items-center gap-1 py-2">
          <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

const ThreadView: React.FC<{
  threadItem: WorkstreamItem;
  threadReplies: WorkstreamItem[];
  onBack: () => void;
  onSendReply: (msg: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  isTyping?: boolean;
}> = ({ threadItem, threadReplies, onBack, onSendReply, onReact, isTyping }) => {
  const [replyInput, setReplyInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadReplies, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = replyInput.trim();
    if (!messageText) return;
    
    onSendReply(messageText);
    setReplyInput('');
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with Back Button */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#212121]/50 backdrop-blur-md z-20">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="border-l border-white/10 pl-4">
          <h3 className="text-sm font-bold text-white/90">Thread</h3>
          <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">#live-workstream</p>
        </div>
      </div>

      {/* Thread Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-4 px-4">
        {/* Original Message */}
        <div className="mb-6 pb-6 border-b border-white/5">
          <MessageItem 
            item={threadItem} 
            onReact={onReact} 
            onReply={() => {}} 
            isInThread={true}
          />
        </div>

        {/* Replies */}
        <div className="space-y-4">
          {threadReplies.map(reply => (
            <MessageItem 
              key={reply.id} 
              item={reply} 
              onReact={onReact} 
              onReply={() => {}} 
              isReply={true}
              isInThread={true}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-white/5 bg-[#212121]">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <input 
              autoComplete="off"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Reply..."
              className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 pr-12 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/20"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-2.5 p-1 text-white/40 hover:text-white transition-colors disabled:opacity-20"
              disabled={!replyInput.trim()}
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ 
  item: WorkstreamItem; 
  onReact: (id: string, emoji: string) => void;
  onReply: (item: WorkstreamItem) => void;
  isReply?: boolean;
  isInThread?: boolean;
  threadReplies?: WorkstreamItem[];
  onOpenThread?: (item: WorkstreamItem) => void;
}> = ({ item, onReact, onReply, isReply, isInThread, threadReplies, onOpenThread }) => {
  const navigate = useNavigate();
  const isAi = item.author.isAi;

  const handleFileClick = () => {
    if (item.metadata?.file?.id) {
      navigate(`/app/files/${item.metadata.file.id}`);
    }
  };

  return (
    <div className={`group relative flex flex-col ${!isAi ? 'px-2 flex items-end min-w-0' : 'px-2'}`}>
      <div className={`group/msg relative flex gap-4 p-4 transition-colors rounded-xl ${!isAi ? 'max-w-[75%] ml-auto mr-2 bg-white/5 hover:bg-white/[0.07]' : 'hover:bg-white/[0.02]'}`}>
        {/* Avatar - Only show for AI messages */}
        {isAi && (
          <div className="shrink-0 mt-1">
            <div className={`rounded-[20px] bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg ${isReply ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[12px]'}`}>
              G.
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header - Only show for AI messages */}
          {isAi && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-white">
                {item.author.name}
              </span>
              <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/30 font-bold uppercase tracking-wider">Agent</span>
              <span className="text-[11px] text-white/20 font-medium">
                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <div className="text-[14px] leading-relaxed text-white/80 whitespace-pre-wrap break-words">
            {item.content}
          </div>

          {/* Rich Content - Files */}
          {item.metadata?.file && (
            <div 
              onClick={handleFileClick}
              className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 w-fit max-w-full hover:border-white/20 transition-all cursor-pointer"
            >
              <div className="text-white/40"><Icons.Files /></div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{item.metadata.file.name}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{item.metadata.file.source}</div>
              </div>
            </div>
          )}

          {/* Rich Content - Decisions */}
          {item.metadata?.decision && (
            <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl max-w-[400px]">
              <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Decision Required</div>
              <div className="text-sm font-bold text-white/90 mb-1">{item.metadata.decision.question}</div>
              <div className="text-xs text-white/50">{item.metadata.decision.proposedAction}</div>
            </div>
          )}

          {/* Reactions */}
          {(item.reactions && item.reactions.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.reactions.map((r, i) => (
                <button 
                  key={i}
                  onClick={() => onReact(item.id, r.emoji)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all ${
                    r.me 
                      ? 'bg-white/10 border-white/20 text-white' 
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-bold">{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread Indicator */}
          {!isReply && !isInThread && threadReplies && threadReplies.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center -space-x-1">
                {threadReplies.slice(0, 3).map((reply, idx) => (
                  <div
                    key={reply.id}
                    className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/60"
                    style={{ zIndex: 10 - idx }}
                  >
                    {reply.author.name.charAt(0)}
                  </div>
                ))}
              </div>
              <button
                onClick={() => onOpenThread?.(item)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
              >
                {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
              </button>
              <span className="text-[11px] text-white/20">
                Last reply {(() => {
                  const lastReply = threadReplies[threadReplies.length - 1];
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const replyDate = new Date(lastReply.timestamp.getFullYear(), lastReply.timestamp.getMonth(), lastReply.timestamp.getDate());
                  
                  if (replyDate.getTime() === today.getTime()) {
                    return `today at ${lastReply.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  }
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  if (replyDate.getTime() === yesterday.getTime()) {
                    return `yesterday at ${lastReply.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  }
                  return lastReply.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + lastReply.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Floating Actions - Show on hover in both main chat and thread sidebar */}
        <div className={`absolute opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-[#212121] border border-white/10 rounded-lg p-0.5 shadow-xl shadow-black/40 z-20 ${!isAi && !isReply ? 'left-2 top-2' : 'right-4 top-2'}`}>
          <button 
            type="button"
            onClick={() => onReact(item.id, '❌')}
            className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            title="Disapprove"
          >
            ❌
          </button>
          <button 
            type="button"
            onClick={() => onReact(item.id, '👀')}
            className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            title="Side eye"
          >
            👀
          </button>
          <button 
            type="button"
            onClick={() => onReact(item.id, '✅')}
            className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            title="Approve"
          >
            ✅
          </button>
          <button 
            type="button"
            onClick={() => onReact(item.id, '❤️')}
            className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            title="Love"
          >
            ❤️
          </button>
          {!isReply && !isInThread && (
            <button 
              type="button"
              onClick={() => {
                if (onOpenThread) {
                  onOpenThread(item);
                } else {
                  onReply(item);
                }
              }}
              className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors ml-1 border-l border-white/5 pl-1"
              title="Reply in thread"
            >
              <Reply size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      
      {/* Timestamp for user messages - beneath the bubble */}
      {!isAi && !isReply && (
        <div className="text-[11px] text-white/20 font-medium mt-1 mr-2 text-right">
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};

export const Workstream: React.FC<WorkstreamProps> = ({
  items,
  onSendMessage,
  onReact,
  isTyping = false,
  openThreadId,
  onThreadChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore
}) => {
  const [input, setInput] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<WorkstreamItem | null>(null);
  const [internalOpenThread, setInternalOpenThread] = React.useState<WorkstreamItem | null>(null);
  const [textareaHeight, setTextareaHeight] = React.useState(60);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const previousScrollHeight = React.useRef<number>(0);
  const previousFirstItemId = React.useRef<string | null>(null);

  // Sync with external openThreadId prop
  const openThread = React.useMemo(() => {
    if (openThreadId) {
      return items.find(i => i.id === openThreadId) || null;
    }
    return internalOpenThread;
  }, [openThreadId, items, internalOpenThread]);

  const setOpenThread = React.useCallback((item: WorkstreamItem | null) => {
    if (onThreadChange) {
      onThreadChange(item?.id || null);
    } else {
      setInternalOpenThread(item);
    }
  }, [onThreadChange]);

  React.useEffect(() => {
    if (scrollRef.current && items.length > 0) {
      const firstItemId = items[0].id;
      const scrollContainer = scrollRef.current;

      // Check if items were prepended (first item changed = older messages loaded)
      const itemsPrepended = previousFirstItemId.current !== null &&
                            previousFirstItemId.current !== firstItemId;

      if (itemsPrepended) {
        // Items were prepended - maintain scroll position relative to content
        const newScrollHeight = scrollContainer.scrollHeight;
        const heightDifference = newScrollHeight - previousScrollHeight.current;
        scrollContainer.scrollTop = scrollContainer.scrollTop + heightDifference;
        console.log('[Workstream] Items prepended, adjusted scroll by', heightDifference);
      } else {
        // New messages or initial load - scroll to bottom
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }

      // Update refs for next comparison
      previousScrollHeight.current = scrollContainer.scrollHeight;
      previousFirstItemId.current = firstItemId;
    }
  }, [items, isTyping]);

  // Handle scroll to load more
  React.useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !onLoadMore) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const { scrollTop } = scrollContainer;

        // If user scrolls within 200px of the top and we have more items
        if (scrollTop < 200 && hasMore && !loadingMore) {
          console.log('[Workstream] Loading more items, scrollTop:', scrollTop);
          onLoadMore();
        }
      }, 100); // Debounce by 100ms
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(scrollTimeout);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadingMore, onLoadMore]);

  // Auto-resize textarea and update container height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // Approximate line height in pixels
      const minHeight = lineHeight * 2.5; // 2.5 lines initial
      const maxHeight = 240; // 10 lines ~ 240px max
      
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText) return;
    
    const replyId = replyingTo?.id;
    onSendMessage(messageText, replyId);
    
    setInput('');
    setReplyingTo(null);
  };

  const handleReplyRequest = (item: WorkstreamItem) => {
    setReplyingTo(item);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleOpenThread = (item: WorkstreamItem) => {
    setOpenThread(item);
  };

  const handleThreadReply = (msg: string) => {
    if (!openThread) return;
    
    // Send reply to thread
    onSendMessage(msg, openThread.id);
  };

  // Group messages for visual threading
  const renderItems = () => {
    const mainItems = items.filter(i => !i.metadata?.replyToId);
    return mainItems.map(mainItem => {
      const threadReplies = items.filter(i => i.metadata?.replyToId === mainItem.id);
      return (
        <div key={mainItem.id} className="flex flex-col mb-2">
          <MessageItem 
            item={mainItem} 
            onReact={onReact} 
            onReply={handleReplyRequest}
            threadReplies={threadReplies}
            onOpenThread={handleOpenThread}
          />
        </div>
      );
    });
  };

  const threadReplies = openThread ? items.filter(i => i.metadata?.replyToId === openThread.id) : [];

  return (
    <div className="flex h-full border border-white/10 rounded-[22px] bg-[#212121] overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        {openThread ? (
          <motion.div
            key="thread-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <ThreadView
              threadItem={openThread}
              threadReplies={threadReplies}
              onBack={() => setOpenThread(null)}
              onSendReply={handleThreadReply}
              onReact={onReact}
              isTyping={isTyping}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main-workstream"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col w-full h-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#212121]/50 backdrop-blur-md z-20">
              <div>
                <h3 className="text-sm font-bold text-white/90">Live Workstream</h3>
                <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">See Sage's progress</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-4 scroll-smooth">
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-medium">Loading older messages...</span>
                  </div>
                </div>
              )}
              {renderItems()}
              {items.length === 0 && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full text-white/20 p-12 text-center">
                  <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-4">
                    <MessageSquare size={24} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium mb-1">Nothing here yet</p>
                  <p className="text-xs text-white/10 max-w-[200px]">
                    When Sage completes tasks or needs your input, you'll see updates here.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#212121] z-20 flex-shrink-0" style={{ height: `${textareaHeight + 32}px`, position: 'relative', transition: 'height 0.2s ease-out' }}>
              <form onSubmit={handleSubmit} className="relative h-full">
                {replyingTo && (
                  <div className="absolute -top-[44px] left-0 right-0 bg-[#212121] border-x border-t border-white/10 rounded-t-xl px-4 py-2 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                    <span className="text-xs text-white/40 truncate flex items-center gap-2">
                      <ChevronLeft size={12} strokeWidth={2.5} className="rotate-180" />
                      Threading to <span className="text-white/60 font-bold">{replyingTo.author.name}</span>: 
                      <span className="italic truncate ml-1 opacity-70">"{replyingTo.content.substring(0, 30)}..."</span>
                    </span>
                    <button type="button" onClick={() => setReplyingTo(null)} className="text-white/20 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 group/input">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      id="workstream-input"
                      autoComplete="off"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        const scrollHeight = target.scrollHeight;
                        const lineHeight = 24;
                        const minHeight = lineHeight * 2.5;
                        const maxHeight = 240;
                        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
                        target.style.height = `${newHeight}px`;
                        setTextareaHeight(newHeight);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }
                      }}
                      placeholder={replyingTo ? `Reply to thread...` : `Message Live Workstream...`}
                      rows={2.5}
                      className={`w-full bg-[#303030] border border-white/10 px-4 pr-12 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/20 resize-none overflow-y-auto ${replyingTo ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
                      style={{
                        minHeight: '60px',
                        maxHeight: '240px',
                        lineHeight: '24px'
                      }}
                    />
                    <button 
                      type="submit" 
                      className="absolute right-3 bottom-3 p-1 text-white/40 hover:text-white transition-colors disabled:opacity-20 group-hover/input:text-white/60"
                      disabled={!input.trim()}
                    >
                      <Send size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
