import React, { useState } from 'react';
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
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '0px';
    const h = el.scrollHeight;
    el.style.height = Math.min(160, h) + 'px';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && messageAttachments.length === 0)) return;

    const content = messageInput.trim() || '[File attachment]';
    try {
      await onSendMessage(content, messageAttachments);
      setMessageInput('');
      setMessageAttachments([]);
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      {/* File Attachments */}
      <MessageAttachments
        messageId={channelId} // Use channel ID as temporary scope until message is persisted
        attachments={messageAttachments}
        onAttachmentsChange={setMessageAttachments}
      />
      
      <form onSubmit={handleSendMessage} className="flex items-end gap-2 mt-3">
        <Textarea
          value={messageInput}
          onChange={(e) => { setMessageInput(e.target.value); autoGrow(e.currentTarget); }}
          placeholder={`Message #${channelName}`}
          className="flex-1 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget.form as any)?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={!messageInput.trim() && messageAttachments.length === 0}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
