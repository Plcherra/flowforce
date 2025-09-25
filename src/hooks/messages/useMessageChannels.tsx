import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import type { MessageChannel, CreateChannelData } from '@/types/messages';

export function useMessageChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChannels();
      
      // Set up real-time subscription for channels
      const channelSubscription = supabase
        .channel('message_channels_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_channels'
          },
          () => {
            fetchChannels(); // Refetch when channels change
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'channel_members'
          },
          () => {
            fetchChannels(); // Refetch when memberships change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channelSubscription);
      };
    } else {
      setChannels([]);
      setLoading(false);
    }
  }, [user]);

  const fetchChannels = async () => {
    if (!user) return;

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
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (channelData: CreateChannelData) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data: channel, error: channelError } = await supabase
        .from('message_channels')
        .insert({
          name: channelData.name,
          description: channelData.description,
          type: channelData.type,
          department_id: channelData.department_id,
          created_by: user.id,
          is_private: channelData.is_private || false
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as admin member
      await supabase.from('channel_members').insert({
        channel_id: channel.id,
        user_id: user.id,
        role: 'admin'
      });

      // Add other members if specified
      if (channelData.member_ids && channelData.member_ids.length > 0) {
        const memberInserts = channelData.member_ids.map(userId => ({
          channel_id: channel.id,
          user_id: userId,
          role: 'member'
        }));
        
        await supabase.from('channel_members').insert(memberInserts);
      }

      await fetchChannels(); // Refresh channels list
      return { data: channel, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;
      await fetchChannels();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateLastRead = async (channelId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating last read:', error);
    }
  };

  return {
    channels,
    loading,
    createChannel,
    joinChannel,
    updateLastRead,
    refetchChannels: fetchChannels
  };
}