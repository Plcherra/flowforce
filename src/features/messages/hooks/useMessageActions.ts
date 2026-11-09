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
import { notifyMessageRecipients } from "@/features/messages/api/messageDelivery";
import { logger } from "@/utils/logger";

export function useMessageActions() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
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
      const senderName = [
        profile?.firstName ?? profile?.first_name,
        profile?.lastName ?? profile?.last_name,
      ]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(" ")
        .trim();
      try {
        const sent = await sendMessageService(channelId, userId, content, {
          ...options,
          companyId: companyId ?? undefined,
          sourceLocale,
        });
        void notifyMessageRecipients({
          channelId,
          senderId: userId,
          senderName,
          content,
        }).catch((error) => {
          logger.error("Failed to notify message recipients", {
            error,
            tags: ["error", "messages"],
          });
        });
        return sent;
      } catch (error) {
        toast({
          title: t("literals.unableToSendMessage"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
          variant: "destructive",
        });
        throw error;
      }
    },
    [companyId, ensureUser, profile, sourceLocale, toast],
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
          title: t("literals.unableToUpdateMessage"),
          description:
            error instanceof Error
              ? error.message
              : t("messages.pleaseTryAgainShortly"),
          variant: "destructive",
        });
        throw error;
      }
    },
    [companyId, ensureUser, sourceLocale, toast],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      ensureUser();
      try {
        await deleteMessageService(messageId);
        toast({
          title: t("literals.messageDeleted"),
          description: t("literals.yourMessageWasRemoved"),
        });
      } catch (error) {
        toast({
          title: t("literals.unableToDeleteMessage"),
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

  return {
    sendMessage,
    updateMessage,
    deleteMessage,
  };
}
