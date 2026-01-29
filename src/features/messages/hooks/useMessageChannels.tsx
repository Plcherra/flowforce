import { useCallback, useEffect, useRef, useState } from "react";
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

// UUID validation pattern
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return UUID_PATTERN.test(value);
};

export function useMessageChannels() {
  const { user, session } = useAuth();
  const { profile } = useProfile();
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Query key includes user ID and company ID for automatic cache invalidation on login/logout
  const userId = session?.user?.id ?? null;
  const rawCompanyId = profile?.companyId ?? profile?.company_id ?? null;
  
  // Validate companyId - only use if it's a valid UUID, otherwise use null
  // This prevents errors when "demo-company" or other non-UUID values are used
  const companyId = isValidUUID(rawCompanyId) ? rawCompanyId : null;
  
  const queryKey = ["message_channels", userId, companyId];

  // Only fetch when user is authenticated
  const enabled = !!session?.user;

  const fetchChannels = useCallback(async () => {
    if (!userId) return;

    // Prevent concurrent fetches and infinite retries
    if (isFetchingRef.current) {
      logger.debug("Channel fetch already in progress, skipping", {
        tags: ["channels"],
      });
      return;
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      logger.warn("Max retries reached for channel fetch", {
        retryCount: retryCountRef.current,
        tags: ["channels", "error"],
      });
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    try {
      // companyId is already validated (null if not a valid UUID)
      // This allows fetching channels even without a company context
      const data = await messagesRepository.listChannels(userId, companyId);
      setChannels(asArray(data));
      setError(null);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      const issue =
        error instanceof Error ? error : new Error("Error fetching channels");
      logger.error("Error fetching channels:", {
        error: issue,
        retryCount: retryCountRef.current,
        tags: ["error"],
      });
      setError(issue);
      retryCountRef.current += 1;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, companyId]);

  useEffect(() => {
    // Prevent running when not logged in
    if (!enabled) {
      setChannels([]);
      setLoading(false);
      setError(null);
      retryCountRef.current = 0; // Reset retry count on logout
      return;
    }

    // Reset retry count when user/company changes (new session)
    retryCountRef.current = 0;
    fetchChannels();
    // Only depend on userId and companyId, not fetchChannels to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, companyId]);

  useRealtime({
    channel: "message_channels_changes",
    events: [
      { event: "*", schema: "public", table: "message_channels" },
      { event: "*", schema: "public", table: "channel_members" },
    ],
    enabled: enabled && Boolean(userId),
    onPayload: () => {
      // Reset retry count on realtime updates to allow fresh fetches
      retryCountRef.current = 0;
      void fetchChannels();
    },
  });

  const createChannel = useCallback(
    async (channelData: CreateChannelData) => {
      if (!enabled || !userId) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { data: null, error: issue };
      }

      try {
        const channel = await createChannelService(channelData, userId);
        // Reset retry count before refetching after successful creation
        retryCountRef.current = 0;
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
    [fetchChannels, enabled, userId],
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!enabled || !userId) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { error: issue };
      }

      try {
        await joinChannelService(channelId, userId);
        // Reset retry count before refetching after successful join
        retryCountRef.current = 0;
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
    [fetchChannels, enabled, userId],
  );

  const updateLastRead = useCallback(
    async (channelId: string) => {
      if (!enabled || !userId) return;

      try {
        await updateLastReadService(channelId, userId);
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
    [enabled, userId],
  );

  const clearError = useCallback(() => setError(null), []);

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!enabled || !userId) {
        const issue = new Error("User not authenticated");
        setError(issue);
        return { error: issue };
      }

      try {
        await deleteChannelService(channelId, userId);
        // Reset retry count before refetching after successful deletion
        retryCountRef.current = 0;
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
    [fetchChannels, enabled, userId],
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
