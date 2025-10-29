import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { MessageReactions } from './MessageReactions';
import { format } from 'date-fns';
import type { Message, ThreadMessage } from '@/types/messages';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  onThreadMessage: (message: ThreadMessage) => void;
}

export function MessagesList({ messages, loading, onThreadMessage }: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <ScrollArea className="flex-1 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages yet. Be the first to send one!</p>
          </div>
        ) : (
          messages.map((message) => {
            const senderProfile = message.sender_profile ?? { first_name: '', last_name: '', avatar_url: null };
            const firstName = senderProfile.first_name ?? '';
            const lastName = senderProfile.last_name ?? '';
            const displayName = `${firstName} ${lastName}`.trim() || 'Team member';
            const initials =
              `${firstName.charAt(0) ?? ''}${lastName.charAt(0) ?? ''}`.trim() ||
              displayName.charAt(0).toUpperCase() ||
              'U';
            const createdAt = message.created_at ? new Date(message.created_at) : null;
            const formattedTimestamp =
              createdAt && !Number.isNaN(createdAt.getTime())
                ? format(createdAt, 'MMM dd, yyyy at h:mm a')
                : '';

            const replyProfile = message.reply_to_message?.sender_profile;
            const replyName = replyProfile
              ? [replyProfile.first_name, replyProfile.last_name].filter(Boolean).join(' ').trim() || 'a teammate'
              : 'a teammate';

            return (
              <div key={message.id} className="flex space-x-3 group hover:bg-gray-50 p-2 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderProfile.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                    {formattedTimestamp && <p className="text-xs text-gray-500">{formattedTimestamp}</p>}
                  </div>
                  {message.reply_to_message && (
                    <div className="mt-1 p-2 bg-gray-50 rounded border-l-2 border-gray-300">
                      <p className="text-xs text-gray-600">Replying to {replyName}</p>
                      <p className="text-sm text-gray-700 truncate">
                        {message.reply_to_message.content || 'Shared a message'}
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-sm text-gray-700">{message.content}</p>

                  {/* Message Actions */}
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        onThreadMessage({
                          id: message.id,
                          content: message.content,
                          sender: {
                            id: message.sender_id,
                            name: displayName,
                            avatar: senderProfile.avatar_url ?? undefined,
                          },
                          createdAt: createdAt ?? new Date(),
                          replyCount: 0,
                        });
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Message Reactions */}
                  <MessageReactions messageId={message.id} className="mt-2" />
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
