import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { MessageReactions } from './MessageReactions';
import { format } from 'date-fns';
import type { Message, ThreadMessage } from '@/types/messages';
import { Skeleton } from '@/components/ui/skeleton';

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
      <ScrollArea className="flex-1 p-4" aria-label="Loading conversation messages">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`messages-skeleton-${index}`} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4" role="log" aria-live="polite">
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
              <div
                key={message.id}
                className="group flex gap-3 rounded-lg p-2 transition hover:bg-muted/60 focus-within:bg-muted/60 dark:hover:bg-muted/40"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderProfile.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    {formattedTimestamp && <p className="text-xs text-muted-foreground">{formattedTimestamp}</p>}
                  </div>
                  {message.reply_to_message && (
                    <div className="mt-1 rounded border-l-2 border-border bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Replying to {replyName}</p>
                      <p className="truncate text-sm text-foreground/80">
                        {message.reply_to_message.content || 'Shared a message'}
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-sm text-foreground">{message.content}</p>

                  {/* Message Actions */}
                  <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Open thread for message from ${displayName}`}
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
