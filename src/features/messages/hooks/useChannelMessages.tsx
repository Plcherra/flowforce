import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/types/messages";
import { messagesRepository } from "@/features/messages/api/messagesRepository";
import { useRealtime } from "@/hooks/useRealtime";
import { useRefreshWhileVisible } from "@/features/messages/hooks/useRefreshWhileVisible";
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
    async (targetChannelId: string, incremental = false, silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
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
        if (!silent) setError(issue);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.id],
  );

  const refreshMessages = useCallback(() => {
    if (!channelId) return;
    void fetchMessages(channelId, false, true);
  }, [channelId, fetchMessages]);

  useRefreshWhileVisible(Boolean(channelId && user?.id), refreshMessages);

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
    onPayload: () => {
      if (!channelId) return;
      // Refetch so the row includes the sender profile. The realtime payload
      // is the raw table row and is not enough to render a chat bubble.
      void fetchMessages(channelId, true, true);
    },
  });

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const safePrev = asArray(prev);
      const withoutDuplicate = safePrev.filter((item) => item.id !== message.id);
      return [...withoutDuplicate, message].sort(
        (left, right) =>
          new Date(left.created_at ?? 0).getTime() -
          new Date(right.created_at ?? 0).getTime(),
      );
    });
  }, []);

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
    appendMessage,
    loadMoreMessages,
    hasMore: safeArrayLength(safeMessages) >= INITIAL_MESSAGE_LIMIT, // Simple check - can be enhanced
    error,
    clearError,
  };
}
