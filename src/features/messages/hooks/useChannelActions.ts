import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { CreateChannelData, MessageChannel } from "@/types/messages";
import {
  createChannel as createChannelService,
  joinChannel as joinChannelService,
  updateChannel as updateChannelService,
  deleteChannel as deleteChannelService,
  updateLastRead as updateLastReadService,
} from "@/features/messages/api/channelService";
import { appEnv } from "@/lib/env";
import { logger } from "@/utils/logger";

export function useChannelActions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const ensureUser = useCallback(() => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user.id;
  }, [user]);

  const createChannel = useCallback(
    async (channelData: CreateChannelData) => {
      const userId = ensureUser();
      try {
        const channel = await createChannelService(channelData, userId);
        toast({
          title: "Channel created",
          description: `#${channel.name} is ready to use.`,
        });
        return channel;
      } catch (error) {
        toast({
          title: "Unable to create channel",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [ensureUser, toast],
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      try {
        await joinChannelService(channelId, userId);
        toast({
          title: "Joined channel",
          description: "You can now see updates in this channel.",
        });
      } catch (error) {
        toast({
          title: "Unable to join channel",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [ensureUser, toast],
  );

  const updateChannel = useCallback(
    async (
      channelId: string,
      payload: Partial<
        Pick<MessageChannel, "name" | "description" | "type" | "is_private">
      >,
    ) => {
      try {
        await updateChannelService(channelId, payload);
        toast({
          title: "Channel updated",
          description: "Your changes were saved.",
        });
      } catch (error) {
        toast({
          title: "Unable to update channel",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast],
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      try {
        await deleteChannelService(channelId, userId);
        toast({
          title: "Channel deleted",
          description: "The channel and its messages were removed.",
        });
      } catch (error) {
        toast({
          title: "Unable to delete channel",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [ensureUser, toast],
  );

  const updateLastRead = useCallback(
    async (channelId: string) => {
      const userId = ensureUser();
      try {
        await updateLastReadService(channelId, userId);
      } catch (error) {
        if (appEnv.DEV) {
          logger.error("Failed to update last read", {
            error,
            tags: ["error"],
          });
        }
      }
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
