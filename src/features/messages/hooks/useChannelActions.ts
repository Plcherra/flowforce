import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';
import type { CreateChannelData, MessageChannel } from '@/types/messages';
import {
  createChannel as createChannelService,
  joinChannel as joinChannelService,
  updateChannel as updateChannelService,
  deleteChannel as deleteChannelService,
  updateLastRead as updateLastReadService,
} from '@/features/messages/api/channelService';

export function useChannelActions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const ensureUser = useCallback(() => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }, [user]);

  const createChannel = useCallback(
    async (channelData: CreateChannelData) => {
      const userId = ensureUser();
      return createChannelService(channelData, userId);
    },
    [ensureUser],
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      await joinChannelService(channelId, userId);
    },
    [ensureUser],
  );

  const updateChannel = useCallback(
    async (
      channelId: string,
      payload: Partial<Pick<MessageChannel, 'name' | 'description' | 'type' | 'is_private'>>,
    ) => {
      await updateChannelService(channelId, payload);
    },
    [],
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      await deleteChannelService(channelId, userId);
      toast({
        title: 'Channel deleted',
        description: 'The channel was removed successfully.',
      });
    },
    [ensureUser, toast],
  );

  const updateLastRead = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      await updateLastReadService(channelId, userId);
    },
    [ensureUser],
  );

  return {
    createChannel,
    joinChannel,
    updateChannel,
    deleteChannel,
    updateLastRead,
  };
}
