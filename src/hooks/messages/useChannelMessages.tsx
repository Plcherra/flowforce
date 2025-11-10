import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import type { Message } from '@/types/messages';
import { supabase } from '@/integrations/supabase/client';
import { messagesRepository } from '@/repositories/messagesRepository';

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

  const subscribeToChannelMessages = useCallback(
    (targetChannelId: string) => {
      const channel = supabase
        .channel(`messages:${targetChannelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${targetChannelId}`,
          },
          () => {
            fetchMessages(targetChannelId);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [fetchMessages],
  );

  useEffect(() => {
    if (!channelId || !user?.id) {
      setMessages([]);
      setError(null);
      return;
    }

    fetchMessages(channelId);
    const unsubscribe = subscribeToChannelMessages(channelId);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [channelId, fetchMessages, subscribeToChannelMessages, user?.id]);

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
