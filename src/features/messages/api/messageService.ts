import { messagesRepository } from "@/features/messages/api/messagesRepository";
import type { AppLanguage } from "@/i18n/resolveLanguage";
import type { MessageAttachment } from "@/types/messages";

export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  options: {
    replyToId?: string;
    attachments?: MessageAttachment[];
    companyId?: string;
    sourceLocale?: AppLanguage;
  } = {},
) {
  return messagesRepository.insertMessage(
    channelId,
    senderId,
    content,
    options,
  );
}

export async function updateMessage(
  messageId: string,
  senderId: string,
  content: string,
  source?: { companyId: string; sourceLocale: AppLanguage },
) {
  return messagesRepository.updateMessage(messageId, senderId, content, source);
}

export async function deleteMessage(messageId: string, senderId: string) {
  await messagesRepository.deleteMessage(messageId, senderId);
}

export async function searchMessages(
  query: string,
  userId: string,
  channelId?: string,
) {
  return messagesRepository.searchMessages(query, userId, channelId);
}
