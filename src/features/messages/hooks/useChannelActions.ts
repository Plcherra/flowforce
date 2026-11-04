import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          title: t("literals.channelCreated"),
          description: t("literals.isReadyToUse", { name: channel.name }),
        });
        return channel;
      } catch (error) {
        toast({
          title: t("literals.unableToCreateChannel"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
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
          title: t("literals.joinedChannel"),
          description: t("literals.youCanNowSeeUpdatesInThisChannel"),
        });
      } catch (error) {
        toast({
          title: t("literals.unableToJoinChannel"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
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
          title: t("literals.channelUpdated"),
          description: t("literals.yourChangesWereSaved"),
        });
      } catch (error) {
        toast({
          title: t("literals.unableToUpdateChannel"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
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
          title: t("literals.channelDeleted"),
          description: t("literals.theChannelAndItsMessagesWereRemoved"),
        });
      } catch (error) {
        toast({
          title: t("literals.unableToDeleteChannel"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
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
