import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import type { Message } from '@/types/messages';

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    fetchMessages(channelId);
    const unsubscribe = subscribeToChannelMessages(channelId);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [channelId]);

  const fetchMessages = async (channelId: string) => {
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
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to handle the reply_to_message properly
      const transformedMessages = (data || []).map(message => ({
        ...message,
        reply_to_message: Array.isArray(message.reply_to_message) && message.reply_to_message.length > 0 
          ? message.reply_to_message[0] 
          : null
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChannelMessages = (channelId: string) => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          fetchMessages(channelId); // Refresh messages to get the full data with joins
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    messages,
    loading,
    refetchMessages: () => channelId && fetchMessages(channelId)
  };
}
