import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import type { MessageChannel, CreateChannelData } from '@/types/messages';
import { supabase } from '@/integrations/supabase/client';
import { messagesRepository } from '@/repositories/messagesRepository';
import {
  createChannel as createChannelService,
  joinChannel as joinChannelService,
  updateLastRead as updateLastReadService,
  deleteChannel as deleteChannelService,
} from '@/features/messages/api/channelService';

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
        const channel = await createChannelService(channelData, user.id);
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
        await joinChannelService(channelId, user.id);
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
        await updateLastReadService(channelId, user.id);
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Error updating last read');
        console.error(issue);
        setError(issue);
      }
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user) {
        const issue = new Error('User not authenticated');
        setError(issue);
        return { error: issue };
      }

      try {
        await deleteChannelService(channelId, user.id);
        await fetchChannels();
        setError(null);
        return { error: null };
      } catch (error) {
        const issue = error instanceof Error ? error : new Error('Failed to delete channel');
        setError(issue);
        return { error: issue };
      }
    },
    [fetchChannels, user],
  );

  return {
    channels,
    loading,
    createChannel,
    joinChannel,
    updateLastRead,
    refetchChannels: fetchChannels,
    deleteChannel,
    error,
    clearError,
  };
}
