import { messagesRepository } from '@/repositories/messagesRepository';
import type { MessageAttachment } from '@/types/messages';

export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
) {
  return messagesRepository.insertMessage(channelId, senderId, content, options);
}

export async function deleteMessage(messageId: string, senderId: string) {
  await messagesRepository.deleteMessage(messageId, senderId);
}

export async function searchMessages(query: string, userId: string, channelId?: string) {
  return messagesRepository.searchMessages(query, userId, channelId);
}
