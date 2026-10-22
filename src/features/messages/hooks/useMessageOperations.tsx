import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import type { MessageAttachment, SearchResult } from "@/types/messages";
import { messagesRepository } from "@/features/messages/api/messagesRepository";

export function useMessageOperations() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const sendMessage = async (
    channelId: string,
    content: string,
    options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
  ) => {
    if (!user)
      return { data: null, error: new Error("User not authenticated") };

    const { replyToId, attachments = [] } = options;

    try {
      const data = await messagesRepository.insertMessage(
        channelId,
        user.id,
        content,
        {
          replyToId,
          attachments,
          companyId: companyId ?? undefined,
          sourceLocale,
        },
      );
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const searchMessages = async (
    query: string,
    channelId?: string,
  ): Promise<{ data: SearchResult[]; error: unknown }> => {
    if (!user || query.trim().length < 2) return { data: [], error: null };

    try {
      const data = await messagesRepository.searchMessages(
        query,
        user.id,
        channelId,
      );
      return { data, error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  return {
    sendMessage,
    searchMessages,
    deleteMessage: async (messageId: string) => {
      if (!user) return { error: new Error("User not authenticated") };
      try {
        await messagesRepository.deleteMessage(messageId, user.id);
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
  };
}
