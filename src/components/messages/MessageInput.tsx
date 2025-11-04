import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { MessageAttachments } from './MessageAttachments';
import type { MessageAttachment } from '@/types/messages';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  onSendMessage: (content: string, attachments: MessageAttachment[]) => Promise<void>;
}

export function MessageInput({ channelId, channelName, onSendMessage }: MessageInputProps) {
  const [messageInput, setMessageInput] = useState('');
  const [messageAttachments, setMessageAttachments] = useState<MessageAttachment[]>([]);
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
      await onSendMessage(payload, messageAttachments);
      setMessageInput('');
      setMessageAttachments([]);
      resizeTextarea();
    } catch (error) {
      console.error('Failed to send message', error);
    }
  }, [messageAttachments, messageInput, onSendMessage, resizeTextarea]);

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

  return (
    <div className="border-t border-gray-200 p-4">
      {/* File Attachments */}
      <MessageAttachments
        messageId={channelId} // Use channel ID as temporary scope until message is persisted
        attachments={messageAttachments}
        onAttachmentsChange={setMessageAttachments}
      />

      <form onSubmit={handleFormSubmit} className="mt-3 flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={messageInput}
          onChange={(event) => {
            setMessageInput(event.target.value);
            resizeTextarea();
          }}
          placeholder={`Message #${channelName}`}
          aria-label={`Message ${channelName}`}
          className="flex-1 resize-none"
          rows={1}
          onKeyDown={handleKeyDown}
        />
        <Button type="submit" disabled={!messageInput.trim() && messageAttachments.length === 0}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
