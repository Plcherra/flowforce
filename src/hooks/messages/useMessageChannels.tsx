import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import type { MessageChannel, CreateChannelData } from '@/types/messages';

export function useMessageChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_channels')
        .select(`
          *,
          created_profile:profiles!created_by(first_name, last_name),
          department:departments(name),
          channel_members(user_id, role, last_read_at)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
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
        const { data: channel, error: channelError } = await supabase
          .from('message_channels')
          .insert({
            name: channelData.name,
            description: channelData.description,
            type: channelData.type,
            department_id: channelData.department_id,
            created_by: user.id,
            is_private: channelData.is_private || false,
          })
          .select()
          .single();

        if (channelError) throw channelError;

        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'admin',
        });

        if (channelData.member_ids && channelData.member_ids.length > 0) {
          const memberInserts = channelData.member_ids.map((userId) => ({
            channel_id: channel.id,
            user_id: userId,
            role: 'member',
          }));

          await supabase.from('channel_members').insert(memberInserts);
        }

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
        const { error } = await supabase.from('channel_members').insert({
          channel_id: channelId,
          user_id: user.id,
          role: 'member',
        });

        if (error) throw error;
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
        await supabase
          .from('channel_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('channel_id', channelId)
          .eq('user_id', user.id);
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
