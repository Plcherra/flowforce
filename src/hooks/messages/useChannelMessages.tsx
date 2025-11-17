import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import type { Message } from '@/types/messages';
import { messagesRepository } from '@/repositories/messagesRepository';
import { useRealtime } from '@/hooks/useRealtime';

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async (targetChannelId: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await messagesRepository.listMessages(targetChannelId, user.id);
      setMessages(data);
      setError(null);
    } catch (error) {
      const issue = error instanceof Error ? error : new Error('Error fetching messages');
      console.error('Error fetching messages:', issue);
      setError(issue);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!channelId || !user?.id) {
      setMessages([]);
      setError(null);
      return;
    }

    fetchMessages(channelId);
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
    onPayload: () => {
      if (channelId) {
        void fetchMessages(channelId);
      }
    },
  });

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    loading,
    refetchMessages: () => {
      if (!channelId) return Promise.resolve();
      return fetchMessages(channelId);
    },
    error,
    clearError,
  };
}
