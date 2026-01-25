import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { MessageAttachments } from './MessageAttachments';
import type { MessageAttachment } from '@/types/messages';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  onSendMessage: (content: string, attachments: MessageAttachment[]) => Promise<void>;
}

export function MessageInput({ channelId, channelName, onSendMessage }: MessageInputProps) {
  const [messageInput, setMessageInput] = useState('');
  const [messageAttachments, setMessageAttachments] = useState<MessageAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const measured = el.scrollHeight;
    el.style.height = `${Math.min(160, measured)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [messageInput, resizeTextarea]);

  useEffect(() => {
    if (messageAttachments.length === 0) {
      resizeTextarea();
    }
  }, [messageAttachments.length, resizeTextarea]);

  const submitMessage = useCallback(async () => {
    const content = messageInput.trim();
    if (!content && messageAttachments.length === 0) return;

    const payload = content || '[File attachment]';
    try {
      setSending(true);
      setErrorMessage(null);
      await onSendMessage(payload, messageAttachments);
      setMessageInput('');
      setMessageAttachments([]);
      resizeTextarea();
    } catch (error) {
      logger.error('Failed to send message', { error, tags: ['error'] });
      setErrorMessage('Unable to send message. Please try again.');
      toast({
        title: 'Message not sent',
        description: 'We could not deliver your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [messageAttachments, messageInput, onSendMessage, resizeTextarea, toast]);

  const handleFormSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await submitMessage();
    },
    [submitMessage],
  );

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        await submitMessage();
      }
    },
    [submitMessage],
  );

  const submitDisabled = (!messageInput.trim() && messageAttachments.length === 0) || sending;

  return (
    <div className="border-t border-border/70 p-4">
      {/* File Attachments */}
      <MessageAttachments
        messageId={channelId} // Use channel ID as temporary scope until message is persisted
        attachments={messageAttachments}
        onAttachmentsChange={setMessageAttachments}
      />

      <form
        onSubmit={handleFormSubmit}
        className="mt-3 flex flex-col gap-2"
        aria-busy={sending}
      >
        <Textarea
          ref={textareaRef}
          value={messageInput}
          onChange={(event) => {
            setMessageInput(event.target.value);
            resizeTextarea();
          }}
          placeholder={`Message #${channelName}`}
          aria-label={`Message ${channelName}`}
          aria-invalid={Boolean(errorMessage)}
          className="flex-1 resize-none"
          rows={1}
          onKeyDown={handleKeyDown}
          />
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="flex items-center justify-end">
          <Button type="submit" disabled={submitDisabled} aria-disabled={submitDisabled}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
