import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Paperclip,
  Image,
  Smile,
  Users as UsersIcon,
} from "lucide-react";
import ErrorBoundary from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";
import {
  getConversationName,
  type Conversation,
  type ChatMessage,
} from "@/components/messages/conversations";
import type { ChatUser } from "@/components/messages/users";

interface ChatPanelProps {
  conversation: Conversation | null;
  usersById: Map<string, ChatUser>;
  currentUserId: string;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  onSendMessage: () => void;
  hasTeammates: boolean;
}

export function ChatPanel({
  conversation,
  usersById,
  currentUserId,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  hasTeammates,
}: ChatPanelProps) {
  const renderMessageBubble = (
    message: ChatMessage,
    previous?: ChatMessage,
  ) => {
    const author = usersById.get(message.authorId);
    const isMine = message.authorId === currentUserId;
    const showAvatar = !isMine && previous?.authorId !== message.authorId;

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-2 sm:gap-3",
          isMine ? "justify-end" : "justify-start",
        )}
      >
        {!isMine && showAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={author?.avatar} alt={author?.name} />
            <AvatarFallback>{author?.name?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
        )}
        <div
          className={cn(
            "allow-text-selection max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
            isMine ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {!isMine && (
            <div className="mb-1 text-xs font-medium text-foreground/80">
              {author?.name ?? "Someone"}
            </div>
          )}
          <div className="allow-text-selection whitespace-pre-line leading-relaxed">
            {message.content}
          </div>
          <div className="mt-1 text-[11px] text-right opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {message.edited && " · edited"}
          </div>
        </div>
      </div>
    );
  };

  if (!conversation) {
    return (
      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          <div className="allow-text-selection space-y-2">
            <MessageSquare className="mx-auto h-10 w-10" />
            <p>
              {hasTeammates
                ? "Select a conversation to view the chat history."
                : "Invite teammates to start your first conversation."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const participantNames = conversation.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => usersById.get(id)?.name ?? "Unknown")
    .join(", ");

  return (
    <Card className="chat-panel flex flex-1 flex-col">
      <CardHeader className="flex flex-col gap-2 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="allow-text-selection">
            <CardTitle>
              {getConversationName(conversation, usersById, currentUserId) ||
                "Conversation"}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>{participantNames}</span>
            </div>
          </div>
          <AvailabilityToggle />
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="space-y-4 py-4">
            {conversation.messages.length === 0 ? (
              <div className="allow-text-selection py-12 text-center text-sm text-muted-foreground">
                Be the first to say something in this chat.
              </div>
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="allow-text-selection rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    Message unavailable. Some content could not be displayed.
                  </div>
                }
              >
                <>
                  {conversation.messages.map((message, index) =>
                    renderMessageBubble(
                      message,
                      conversation.messages[index - 1],
                    ),
                  )}
                </>
              </ErrorBoundary>
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
            <Textarea
              placeholder="Write a message..."
              value={draftMessage}
              onChange={(event) => onDraftMessageChange(event.target.value)}
              className="min-h-[96px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 allow-text-selection"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  title="Add image"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={onSendMessage} disabled={!draftMessage.trim()}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
