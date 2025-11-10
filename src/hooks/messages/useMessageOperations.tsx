import { useAuth } from '../useAuth';
import type { MessageAttachment, SearchResult } from '@/types/messages';
import { messagesRepository } from '@/repositories/messagesRepository';

export function useMessageOperations() {
  const { user } = useAuth();

  const sendMessage = async (
    channelId: string,
    content: string,
    options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { replyToId, attachments = [] } = options;

    try {
      const data = await messagesRepository.insertMessage(channelId, user.id, content, {
        replyToId,
        attachments,
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const searchMessages = async (query: string, channelId?: string): Promise<{ data: SearchResult[]; error: unknown }> => {
    if (!user || query.trim().length < 2) return { data: [], error: null };

    try {
      const data = await messagesRepository.searchMessages(query, user.id, channelId);
      return { data, error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  return {
    sendMessage,
    searchMessages,
    deleteMessage: async (messageId: string) => {
      if (!user) return { error: new Error('User not authenticated') };
      try {
        await messagesRepository.deleteMessage(messageId, user.id);
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
  };
}
