import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { getCurrentInstanceAccess } from '../services/instanceAccess';
import { WorkstreamItem, Reaction, DecisionCard, GIAFile } from '../types';
import type { Json } from '@/src/integrations/supabase/types';

interface WorkstreamEventRow {
  id: string;
  instance_id: string | null;
  user_id: string;
  event_type: string;
  message: string;
  attachments: Json;
  event_data: Json;
  metadata: Json;
  created_at: string | null;
  is_read: boolean | null;
  reaction_count: number | null;
  task_id: string | null;
  agent_task_id: string | null;
}

// Helper to safely parse JSON fields
const parseJsonField = <T>(field: Json | null | undefined, defaultValue: T): T => {
  if (!field) return defaultValue;
  if (typeof field === 'object') return field as unknown as T;
  return defaultValue;
};

// Transform database row to WorkstreamItem
const transformEventToWorkstreamItem = (event: WorkstreamEventRow): WorkstreamItem => {
  const eventData = parseJsonField<Record<string, unknown>>(event.event_data, {});
  const metadata = parseJsonField<Record<string, unknown>>(event.metadata, {});
  const attachments = parseJsonField<unknown[]>(event.attachments, []);

  // Determine if this is a user message
  // 'user_message' events are user messages
  const isUserMessage = event.event_type === 'user_message' && 
                        !metadata.is_agent && 
                        !metadata.is_system;
  const isAiMessage = !isUserMessage;

  // Parse reactions from metadata if available
  const reactions: Reaction[] = [];
  if (metadata.reactions && Array.isArray(metadata.reactions)) {
    metadata.reactions.forEach((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const reaction = r as Record<string, unknown>;
        reactions.push({
          emoji: String(reaction.emoji || ''),
          count: Number(reaction.count || 1),
          me: Boolean(reaction.me)
        });
      }
    });
  }

  // Parse file attachment if present
  let file: GIAFile | undefined;
  if (attachments.length > 0) {
    const firstAttachment = attachments[0] as Record<string, unknown>;
    if (firstAttachment && typeof firstAttachment === 'object') {
      file = {
        id: String(firstAttachment.id || event.id),
        name: String(firstAttachment.name || 'Attachment'),
        owner: String(firstAttachment.owner || 'Sage'),
        lastModified: String(firstAttachment.lastModified || 'Now'),
        source: String(firstAttachment.source || 'Uploaded'),
        tags: Array.isArray(firstAttachment.tags) ? firstAttachment.tags.map(String) : [],
        type: (firstAttachment.type as GIAFile['type']) || 'file'
      };
    }
  }

  // Parse decision if present
  let decision: DecisionCard | undefined;
  if (eventData.decision && typeof eventData.decision === 'object') {
    const d = eventData.decision as Record<string, unknown>;
    decision = {
      id: String(d.id || event.id),
      question: String(d.question || ''),
      contextNotes: String(d.contextNotes || d.context_notes || ''),
      impact: String(d.impact || ''),
      proposedAction: String(d.proposedAction || d.proposed_action || '')
    };
  }

  return {
    id: event.id,
    author: {
      name: isAiMessage ? 'Sage Agent' : String(metadata.author_name || 'You'),
      isAi: isAiMessage,
      avatar: metadata.avatar as string | undefined
    },
    type: event.event_type as WorkstreamItem['type'],
    content: event.message,
    timestamp: new Date(event.created_at || Date.now()),
    reactions: reactions.length > 0 ? reactions : undefined,
    metadata: {
      file,
      decision,
      replyToId: metadata.reply_to_id as string | undefined,
      isReply: Boolean(metadata.reply_to_id)
    }
  };
};

export const useWorkstreamRealtime = () => {
  const [items, setItems] = useState<WorkstreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null);

  const BATCH_SIZE = 50; // Load 50 items at a time

  // Fetch initial data (most recent items)
  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      const instance = await getCurrentInstanceAccess();

      const { data, error: fetchError } = await supabase
        .from('workstream_events')
        .select('*')
        .eq('instance_id', instance.instanceId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error('Error fetching workstream events:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        // Store the oldest timestamp BEFORE reversing
        if (data.length > 0) {
          setOldestTimestamp(data[data.length - 1].created_at);
        }

        // Reverse to show oldest first (chronological order)
        const transformedItems = data.reverse().map(transformEventToWorkstreamItem);
        setItems(transformedItems);

        // Check if there are more items
        setHasMore(data.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error in fetchEvents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more older messages
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !oldestTimestamp) {
      console.log('[useWorkstreamRealtime] Skipping loadMore - hasMore:', hasMore, 'loadingMore:', loadingMore, 'oldestTimestamp:', oldestTimestamp);
      return;
    }

    console.log('[useWorkstreamRealtime] Loading more items older than:', oldestTimestamp);
    setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const instance = await getCurrentInstanceAccess();

      const { data, error: fetchError } = await supabase
        .from('workstream_events')
        .select('*')
        .eq('instance_id', instance.instanceId)
        .eq('user_id', user.id)
        .lt('created_at', oldestTimestamp)
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);

      console.log('[useWorkstreamRealtime] Loaded', data?.length || 0, 'items');

      if (fetchError) {
        console.error('Error loading more events:', fetchError);
        return;
      }

      if (data && data.length > 0) {
        // Store the oldest timestamp BEFORE reversing (last item in DESC order)
        const newOldestTimestamp = data[data.length - 1].created_at;
        console.log('[useWorkstreamRealtime] Setting new oldestTimestamp:', newOldestTimestamp);
        setOldestTimestamp(newOldestTimestamp);

        // Reverse and prepend to existing items (older messages go at the beginning)
        const transformedItems = data.reverse().map(transformEventToWorkstreamItem);

        // Deduplicate by ID to prevent any repeated items
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = transformedItems.filter(item => !existingIds.has(item.id));
          console.log('[useWorkstreamRealtime] Adding', newItems.length, 'new items,', transformedItems.length - newItems.length, 'duplicates filtered');
          return [...newItems, ...prev];
        });

        // Check if there are more items
        setHasMore(data.length === BATCH_SIZE);
      } else {
        console.log('[useWorkstreamRealtime] No more items to load');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error in loadMore:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, oldestTimestamp]);

  // Set up real-time subscription
  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      await fetchEvents();
      const instance = await getCurrentInstanceAccess();

      activeChannel = supabase
        .channel(`workstream_realtime:${instance.instanceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'workstream_events',
            filter: `instance_id=eq.${instance.instanceId}`,
          },
          (payload) => {
            const newItem = transformEventToWorkstreamItem(payload.new as WorkstreamEventRow);
            setItems((prev) => [...prev, newItem]);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workstream_events',
            filter: `instance_id=eq.${instance.instanceId}`,
          },
          (payload) => {
            const updatedItem = transformEventToWorkstreamItem(payload.new as WorkstreamEventRow);
            setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'workstream_events',
            filter: `instance_id=eq.${instance.instanceId}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((item) => item.id !== deletedId));
          },
        )
        .subscribe();
    })();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [fetchEvents]);

  // Send a message (insert into workstream_events)
  const sendMessage = useCallback(async (
    message: string,
    replyToId?: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      const instance = await getCurrentInstanceAccess();

      const { data, error: insertError } = await supabase
        .from('workstream_events')
        .insert({
          instance_id: instance.instanceId,
          user_id: user.id,
          event_type: 'user_message',
          message: message,
          conversation_id: conversationId || null,
          metadata: {
            author_name: 'You',
            reply_to_id: replyToId || null
          },
          attachments: [],
          event_data: {}
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error sending message:', insertError);
        return { success: false, error: insertError.message };
      }

      return { success: true, id: data?.id };
    } catch (err) {
      console.error('Error in sendMessage:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  // Send an agent message (insert into workstream_events)
  const sendAgentMessage = useCallback(async (
    message: string,
    replyToId?: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      const instance = await getCurrentInstanceAccess();

      const { data, error: insertError } = await supabase
        .from('workstream_events')
        .insert({
          instance_id: instance.instanceId,
          user_id: user.id,
          event_type: 'agent_message',
          message: message,
          conversation_id: conversationId || null,
          metadata: {
            author_name: 'Sage Agent',
            is_agent: true,
            reply_to_id: replyToId || null
          },
          attachments: [],
          event_data: {}
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error sending agent message:', insertError);
        return { success: false, error: insertError.message };
      }

      return { success: true, id: data?.id };
    } catch (err) {
      console.error('Error in sendAgentMessage:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  // Add reaction to a message
  const addReaction = useCallback(async (
    eventId: string, 
    emoji: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Use the RPC function to add reaction
      const { data, error: rpcError } = await supabase
        .rpc('add_workstream_reaction', {
          p_event_id: eventId,
          p_user_id: user.id
        });

      if (rpcError) {
        console.error('Error adding reaction:', rpcError);
        // Fall back to local state update for now
        setItems(prev => prev.map(item => {
          if (item.id === eventId) {
            const reactions = [...(item.reactions || [])];
            const existing = reactions.find(r => r.emoji === emoji);
            if (existing) {
              if (existing.me) {
                existing.count--;
                existing.me = false;
              } else {
                existing.count++;
                existing.me = true;
              }
            } else {
              reactions.push({ emoji, count: 1, me: true });
            }
            return { ...item, reactions: reactions.filter(r => r.count > 0) };
          }
          return item;
        }));
        return { success: true };
      }

      return { success: true };
    } catch (err) {
      console.error('Error in addReaction:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    sendMessage,
    sendAgentMessage,
    addReaction,
    refetch: fetchEvents
  };
};
