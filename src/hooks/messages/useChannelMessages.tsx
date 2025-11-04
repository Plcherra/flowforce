import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import type { Message } from '@/types/messages';

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async (targetChannelId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!sender_id(first_name, last_name, avatar_url),
          reply_to_message:messages!reply_to_id(
            content,
            sender_profile:profiles!sender_id(first_name, last_name)
          )
        `)
        .eq('channel_id', targetChannelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const transformedMessages = (data ?? []).map((message) => ({
        ...message,
        reply_to_message:
          Array.isArray(message.reply_to_message) && message.reply_to_message.length > 0
            ? message.reply_to_message[0]
            : null,
      }));

      setMessages(transformedMessages);
      setError(null);
    } catch (error) {
      const issue = error instanceof Error ? error : new Error('Error fetching messages');
      console.error('Error fetching messages:', issue);
      setError(issue);
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!channelId) {
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
