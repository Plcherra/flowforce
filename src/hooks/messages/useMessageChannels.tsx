import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import type { MessageChannel, CreateChannelData } from '@/types/messages';
import { supabase } from '@/integrations/supabase/client';
import { messagesRepository } from '@/repositories/messagesRepository';

export function useMessageChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await messagesRepository.listChannels(user.id);
      setChannels(data ?? []);
      setError(null);
    } catch (error) {
      const issue = error instanceof Error ? error : new Error('Error fetching channels');
      console.error('Error fetching channels:', issue);
      setError(issue);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchChannels();

    const channelSubscription = supabase
      .channel('message_channels_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_channels',
        },
        () => {
          fetchChannels();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
        },
        () => {
          fetchChannels();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [fetchChannels, user]);

  const createChannel = useCallback(
    async (channelData: CreateChannelData) => {
      if (!user) {
        const issue = new Error('User not authenticated');
        setError(issue);
        return { data: null, error: issue };
      }

      try {
        const channel = await messagesRepository.createChannel(channelData, user.id);
        const uniqueMembers = Array.from(
          new Set([user.id, ...(channelData.member_ids ?? [])]),
        ).map((memberId) => ({
          user_id: memberId,
          role: memberId === user.id ? 'admin' : 'member',
        }));
        await messagesRepository.addChannelMembers(channel.id, uniqueMembers);
        await fetchChannels();
        setError(null);
        return { data: channel, error: null };
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Failed to create channel');
        setError(issue);
        return { data: null, error: issue };
      }
    },
    [fetchChannels, user],
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user) {
        const issue = new Error('User not authenticated');
        setError(issue);
        return { error: issue };
      }

      try {
        await messagesRepository.addChannelMembers(channelId, [{ user_id: user.id, role: 'member' }]);
        await fetchChannels();
        setError(null);
        return { error: null };
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Failed to join channel');
        setError(issue);
        return { error: issue };
      }
    },
    [fetchChannels, user],
  );

  const updateLastRead = useCallback(
    async (channelId: string) => {
      if (!user) return;

      try {
        await messagesRepository.updateLastRead(channelId, user.id);
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Error updating last read');
        console.error(issue);
        setError(issue);
      }
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    channels,
    loading,
    createChannel,
    joinChannel,
    updateLastRead,
    refetchChannels: fetchChannels,
    error,
    clearError,
  };
}
