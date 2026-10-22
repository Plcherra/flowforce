import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import type { MessageAttachment } from "@/types/messages";
import {
  sendMessage as sendMessageService,
  deleteMessage as deleteMessageService,
  updateMessage as updateMessageService,
} from "@/features/messages/api/messageService";

export function useMessageActions() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { toast } = useToast();

  const ensureUser = useCallback(() => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user.id;
  }, [user]);

  const sendMessage = useCallback(
    async (
      channelId: string,
      content: string,
      options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
    ) => {
      const userId = ensureUser();
      try {
        return await sendMessageService(channelId, userId, content, {
          ...options,
          companyId: companyId ?? undefined,
          sourceLocale,
        });
      } catch (error) {
        toast({
          title: "Unable to send message",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [companyId, ensureUser, sourceLocale, toast],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      const userId = ensureUser();
      try {
        return await updateMessageService(
          messageId,
          userId,
          content,
          companyId ? { companyId, sourceLocale } : undefined,
        );
      } catch (error) {
        toast({
          title: "Unable to update message",
          description:
            error instanceof Error
              ? error.message
              : "Please try again shortly.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [companyId, ensureUser, sourceLocale, toast],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const userId = ensureUser();
      try {
        await deleteMessageService(messageId, userId);
        toast({
          title: "Message deleted",
          description: "Your message was removed.",
        });
      } catch (error) {
        toast({
          title: "Unable to delete message",
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

  return {
    sendMessage,
    updateMessage,
    deleteMessage,
  };
}
