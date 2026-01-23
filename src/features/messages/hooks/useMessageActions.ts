import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { MessageAttachment } from '@/types/messages';
import { sendMessage as sendMessageService, deleteMessage as deleteMessageService, updateMessage as updateMessageService } from '@/features/messages/api/messageService';

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
      try {
        return await sendMessageService(channelId, userId, content, options);
      } catch (error) {
        toast({
          title: 'Unable to send message',
          description: error instanceof Error ? error.message : 'Please try again shortly.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [ensureUser, toast],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      const userId = ensureUser();
      try {
        return await updateMessageService(messageId, userId, content);
      } catch (error) {
        toast({
          title: 'Unable to update message',
          description: error instanceof Error ? error.message : 'Please try again shortly.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [ensureUser, toast],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const userId = ensureUser();
      try {
        await deleteMessageService(messageId, userId);
        toast({
          title: 'Message deleted',
          description: 'Your message was removed.',
        });
      } catch (error) {
        toast({
          title: 'Unable to delete message',
          description: error instanceof Error ? error.message : 'Please try again shortly.',
          variant: 'destructive',
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
