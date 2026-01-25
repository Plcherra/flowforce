import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../useAuth';
import type { Message } from '@/types/messages';
import { messagesRepository } from '@/repositories/messagesRepository';
import { useRealtime } from '@/hooks/useRealtime';
import { logger } from '@/utils/logger';

const INITIAL_MESSAGE_LIMIT = 50; // Phase 4 optimization: Limit initial fetch

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchMessages = useCallback(
    async (targetChannelId: string, incremental = false) => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Phase 4 optimization: Incremental append for new messages
        const options = incremental && lastMessageTimestampRef.current
          ? { after: lastMessageTimestampRef.current }
          : { limit: INITIAL_MESSAGE_LIMIT };

        const data = await messagesRepository.listMessages(targetChannelId, user.id, options);

        if (incremental) {
          // Append new messages to existing ones
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = data.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newMessages].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          });
        } else {
          // Initial load: replace all messages
          setMessages(data);
          if (data.length > 0) {
            lastMessageTimestampRef.current = data[data.length - 1].created_at;
          }
        }
        setError(null);
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Error fetching messages');
        logger.error('Error fetching messages', { error: issue, tags: ['error'] });
        setError(issue);
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (!channelId || !user?.id) {
      setMessages([]);
      setError(null);
      lastMessageTimestampRef.current = null;
      isInitialLoadRef.current = true;
      return;
    }

    // Reset on channel change
    lastMessageTimestampRef.current = null;
    isInitialLoadRef.current = true;
    fetchMessages(channelId, false);
  }, [channelId, fetchMessages, user?.id]);

  useRealtime({
    channel: channelId ? `messages:${channelId}` : 'messages',
    events: channelId
      ? [
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId}`,
          },
        ]
      : [],
    enabled: Boolean(channelId && user?.id),
    onPayload: (payload) => {
      if (channelId && payload.new) {
        // Phase 4 optimization: Incremental append instead of full refetch
        const newMessage = payload.new as Message;
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          // Append new message and sort
          const updated = [...prev, newMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
          // Update last timestamp
          if (updated.length > 0) {
            lastMessageTimestampRef.current = updated[updated.length - 1].created_at;
          }
          return updated;
        });
      }
    },
  });

  const clearError = useCallback(() => setError(null), []);

  const loadMoreMessages = useCallback(() => {
    if (!channelId || !lastMessageTimestampRef.current) return Promise.resolve();
    return fetchMessages(channelId, true);
  }, [channelId, fetchMessages]);

  return {
    messages,
    loading,
    refetchMessages: () => {
      if (!channelId) return Promise.resolve();
      lastMessageTimestampRef.current = null;
      return fetchMessages(channelId, false);
    },
    loadMoreMessages,
    hasMore: messages.length >= INITIAL_MESSAGE_LIMIT, // Simple check - can be enhanced
    error,
    clearError,
  };
}
