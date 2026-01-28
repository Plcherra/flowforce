import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRealtime } from "@/hooks/useRealtime";
import type { MessageChannel, CreateChannelData } from "@/types/messages";
import { messagesRepository } from "@/repositories/messagesRepository";
import { logger } from "@/utils/logger";
import { asArray } from "@/utils/reactQueryTypes";
import {
  createChannel as createChannelService,
  joinChannel as joinChannelService,
  updateLastRead as updateLastReadService,
  deleteChannel as deleteChannelService,
} from "@/features/messages/api/channelService";

export function useMessageChannels() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;
      const data = await messagesRepository.listChannels(user.id, companyId);
      setChannels(asArray(data));
      setError(null);
    } catch (error) {
      const issue =
        error instanceof Error ? error : new Error("Error fetching channels");
      logger.error("Error fetching channels:", {
        error: issue,
        tags: ["error"],
      });
      setError(issue);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.companyId, profile?.company_id]);

  useEffect(() => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchChannels();
  }, [fetchChannels, user]);

  useRealtime({
    channel: "message_channels_changes",
    events: [
      { event: "*", schema: "public", table: "message_channels" },
      { event: "*", schema: "public", table: "channel_members" },
    ],
    enabled: Boolean(user?.id),
    onPayload: () => {
      void fetchChannels();
    },
  });

  const createChannel = useCallback(
    async (channelData: CreateChannelData) => {
      if (!user) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { data: null, error: issue };
      }

      try {
        const channel = await createChannelService(channelData, user.id);
        await fetchChannels();
        setError(null);
        return { data: channel, error: null };
      } catch (error) {
        const issue =
          error instanceof Error
            ? error
            : new Error("Failed to create channel");
        setError(issue);
        return { data: null, error: issue };
      }
    },
    [fetchChannels, user],
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { error: issue };
      }

      try {
        await joinChannelService(channelId, user.id);
        await fetchChannels();
        setError(null);
        return { error: null };
      } catch (error) {
        const issue =
          error instanceof Error ? error : new Error("Failed to join channel");
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
        const issue =
          error instanceof Error
            ? error
            : new Error("Error updating last read");
        logger.error("Error updating last read", {
          error: issue,
          tags: ["error"],
        });
        setError(issue);
      }
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { error: issue };
      }

      try {
        await deleteChannelService(channelId, user.id);
        await fetchChannels();
        setError(null);
        return { error: null };
      } catch (error) {
        const issue =
          error instanceof Error
            ? error
            : new Error("Failed to delete channel");
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
