import React from "react";
import { Plus, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageFilterBar } from "@/components/MessageFilterBar";
import { cn } from "@/lib/utils";
import {
  getConversationName,
  type Conversation,
} from "@/components/messages/conversations";
import type { ChatUser } from "@/components/messages/users";

export type ConversationFilter = "all" | "unread" | "teams" | "helpdesk";

interface ConversationsPanelProps {
  filter: ConversationFilter;
  onFilterChange: (value: ConversationFilter) => void;
  query: string;
  onQueryChange: (value: string) => void;
  conversations: Conversation[];
  totalConversations: number;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  hasTeammates: boolean;
  onNewConversation: () => void;
  usersById: Map<string, ChatUser>;
  currentUserId: string;
  className?: string;
}

export function ConversationsPanel({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  conversations,
  totalConversations,
  activeConversationId,
  onSelectConversation,
  hasTeammates,
  onNewConversation,
  usersById,
  currentUserId,
  className,
}: ConversationsPanelProps) {
  const renderConversationMeta = (conversation: Conversation) => {
    const counterpartId =
      conversation.type === "direct"
        ? conversation.participantIds.find((id) => id !== currentUserId)
        : undefined;

    const conversationName =
      getConversationName(conversation, usersById, currentUserId) ||
      "Conversation";
    const avatarSrc = counterpartId
      ? usersById.get(counterpartId)?.avatar
      : undefined;
    const avatarFallback = conversationName.slice(0, 2).toUpperCase() || "CH";

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const authorName = lastMessage
      ? usersById.get(lastMessage.authorId)?.name
      : undefined;
    const firstName = authorName?.split?.(" ")?.[0] ?? "Unknown";

    return (
      <div
        key={conversation.id}
        className={cn(
          "rounded-2xl border border-border/50 bg-background/95 shadow-sm transition duration-200 hover:border-primary/60 hover:shadow-md",
          activeConversationId === conversation.id &&
            "border-primary/70 bg-primary/5 shadow-md",
        )}
      >
        <button
          type="button"
          onClick={() => onSelectConversation(conversation.id)}
          className="group flex w-full items-center gap-4 px-4 py-4 text-left allow-text-selection"
        >
          <Avatar className="h-11 w-11">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={conversationName} />
            ) : (
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{conversationName}</span>
              {lastMessage && (
                <span className="text-xs text-muted-foreground group-hover:text-foreground/80">
                  {new Date(lastMessage.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            {lastMessage ? (
              <p className="line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                {firstName || "—"}: {lastMessage.content}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No messages yet</p>
            )}
          </div>
          {conversation.unreadCount > 0 && (
            <Badge
              variant="default"
              className="ml-auto px-2 py-0.5 text-[11px]"
            >
              {conversation.unreadCount}
            </Badge>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className={cn("flex h-full w-full flex-col pr-3 lg:pr-4", className)}>
      <Card className="flex flex-1 flex-col">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Conversations</CardTitle>
              <p className="text-xs text-muted-foreground">
                Talk with teammates and groups
              </p>
            </div>
            <Button
              size="sm"
              onClick={onNewConversation}
              disabled={!hasTeammates}
              title={
                hasTeammates
                  ? undefined
                  : "Invite teammates to start a new chat"
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              New chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-col gap-2">
            <MessageFilterBar
              active={filter}
              onChange={onFilterChange}
              labels={{
                all: "All",
                unread: "Unread",
                teams: "Teams",
                helpdesk: "Help Desk",
              }}
            />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search"
              className="h-9 w-full sm:max-w-[240px]"
            />
          </div>

          {!hasTeammates && (
            <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-xs text-muted-foreground allow-text-selection">
              <p className="text-sm font-medium text-foreground">
                You&apos;re the first one here.
              </p>
              <p className="mt-1">
                Invite teammates to the workspace and your conversations will
                appear once they join.
              </p>
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1 pr-1">
            <div className="space-y-3">
              {conversations.map((conversation) =>
                renderConversationMeta(conversation),
              )}

              {conversations.length === 0 && (
                <div className="allow-text-selection py-12 text-center text-sm text-muted-foreground">
                  <UsersIcon className="mx-auto mb-3 h-8 w-8" />
                  <p>
                    {hasTeammates
                      ? totalConversations === 0
                        ? "No conversations yet"
                        : "No conversations match the current filters"
                      : "Invite teammates to start your first conversation"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
