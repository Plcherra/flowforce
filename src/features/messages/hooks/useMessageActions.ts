import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import type { MessageAttachment } from '@/types/messages';
import { sendMessage as sendMessageService, deleteMessage as deleteMessageService } from '@/features/messages/api/messageService';

export function useMessageActions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const ensureUser = useCallback(() => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }, [user]);

  const sendMessage = useCallback(
    async (channelId: string, content: string, options: { replyToId?: string; attachments?: MessageAttachment[] } = {}) => {
      const userId = ensureUser();
      return sendMessageService(channelId, userId, content, options);
    },
    [ensureUser],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const userId = ensureUser();
      await deleteMessageService(messageId, userId);
      toast({
        title: 'Message deleted',
        description: 'Your message was removed.',
      });
    },
    [ensureUser, toast],
  );

  return {
    sendMessage,
    deleteMessage,
  };
}
