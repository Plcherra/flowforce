import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/types/messages";
import { messagesRepository } from "@/repositories/messagesRepository";
import { useRealtime } from "@/hooks/useRealtime";
import { logger } from "@/utils/logger";
import {
  asArray,
  safeArrayMap,
  safeArrayLength,
} from "@/utils/reactQueryTypes";

const INITIAL_MESSAGE_LIMIT = 50; // Phase 4 optimization: Limit initial fetch

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchMessages = useCallback(
    async (targetChannelId: string, incremental = false) => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Phase 4 optimization: Incremental append for new messages
        const options =
          incremental && lastMessageTimestampRef.current
            ? { after: lastMessageTimestampRef.current }
            : { limit: INITIAL_MESSAGE_LIMIT };

        const data = await messagesRepository.listMessages(
          targetChannelId,
          user.id,
          options,
        );

        const safeData = asArray(data);
        if (incremental) {
          // Append new messages to existing ones
          setMessages((prev) => {
            const safePrev = asArray(prev);
            const existingIds = new Set(safeArrayMap(safePrev, (m) => m.id));
            const newMessages = safeData.filter((m) => !existingIds.has(m.id));
            return [...safePrev, ...newMessages].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          });
        } else {
          // Initial load: replace all messages
          setMessages(safeData);
          if (safeArrayLength(safeData) > 0) {
            const lastIndex = safeArrayLength(safeData) - 1;
            lastMessageTimestampRef.current =
              safeData[lastIndex]?.created_at ?? null;
          }
        }
        setError(null);
      } catch (error) {
        const issue =
          error instanceof Error ? error : new Error("Error fetching messages");
        logger.error("Error fetching messages", {
          error: issue,
          tags: ["error"],
        });
        setError(issue);
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (!channelId || !user?.id) {
      setMessages([]);
      setError(null);
      lastMessageTimestampRef.current = null;
      isInitialLoadRef.current = true;
      return;
    }

    // Reset on channel change
    lastMessageTimestampRef.current = null;
    isInitialLoadRef.current = true;
    fetchMessages(channelId, false);
  }, [channelId, fetchMessages, user?.id]);

  useRealtime({
    channel: channelId ? `messages:${channelId}` : "messages",
    events: channelId
      ? [
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${channelId}`,
          },
        ]
      : [],
    enabled: Boolean(channelId && user?.id),
    onPayload: (payload) => {
      if (channelId && payload.new) {
        // Phase 4 optimization: Incremental append instead of full refetch
        const newMessage = payload.new as Message;
        setMessages((prev) => {
          const safePrev = asArray(prev);
          // Check if message already exists (avoid duplicates)
          if (safePrev.some((m) => m.id === newMessage.id)) {
            return safePrev;
          }
          // Append new message and sort
          const updated = [...safePrev, newMessage].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
          // Update last timestamp
          if (safeArrayLength(updated) > 0) {
            const lastIndex = safeArrayLength(updated) - 1;
            lastMessageTimestampRef.current =
              updated[lastIndex]?.created_at ?? null;
          }
          return updated;
        });
      }
    },
  });

  const clearError = useCallback(() => setError(null), []);

  const loadMoreMessages = useCallback(() => {
    if (!channelId || !lastMessageTimestampRef.current)
      return Promise.resolve();
    return fetchMessages(channelId, true);
  }, [channelId, fetchMessages]);

  const safeMessages = asArray(messages);

  return {
    messages: safeMessages,
    loading,
    refetchMessages: () => {
      if (!channelId) return Promise.resolve();
      lastMessageTimestampRef.current = null;
      return fetchMessages(channelId, false);
    },
    loadMoreMessages,
    hasMore: safeArrayLength(safeMessages) >= INITIAL_MESSAGE_LIMIT, // Simple check - can be enhanced
    error,
    clearError,
  };
}
