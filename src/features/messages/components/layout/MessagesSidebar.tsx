import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageChannel } from "@/types/messages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MessagesSidebarProps {
  channels: MessageChannel[];
  currentChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onShowCreateDialog: () => void;
  onShowDirectMessageDialog: () => void;
  query?: string;
  onQueryChange?: (v: string) => void;
}

function isDirectChat(channel: MessageChannel) {
  return (channel.type ?? "").toLowerCase() === "direct";
}

export function MessagesSidebar({
  channels,
  currentChannelId,
  onChannelSelect,
  onShowCreateDialog,
  onShowDirectMessageDialog,
  query,
  onQueryChange,
}: MessagesSidebarProps) {
  const { t } = useTranslation();
  const people = channels.filter(isDirectChat);
  const groups = channels.filter((channel) => !isDirectChat(channel));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("messages.chats")}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" aria-label={t("messages.startAChat")}>
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShowDirectMessageDialog}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {t("messages.messageSomeone")} </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowCreateDialog}>
                <Users className="mr-2 h-4 w-4" />
                {t("messages.newGroup")} </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {typeof onQueryChange === "function" && typeof query === "string" && (
          <div>
            <Label htmlFor="messages-sidebar-search" className="sr-only">
              {t("messages.searchChats")} </Label>
            <Input
              id="messages-sidebar-search"
              placeholder={t("messages.searchChats")}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {channels.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <p className="mb-4 text-sm text-muted-foreground">{t("messages.noChatsYet")}</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={onShowDirectMessageDialog}>
                  {t("messages.messageSomeone")} </Button>
                <Button onClick={onShowCreateDialog}>{t("messages.newGroup")}</Button>
              </div>
            </div>
          ) : (
            <>
              <ChatSection
                title={t("schedule.people")}
                channels={people}
                currentChannelId={currentChannelId}
                onChannelSelect={onChannelSelect}
                emptyLabel="No direct messages yet"
              />
              <ChatSection
                title={t("messages.groups")}
                channels={groups}
                currentChannelId={currentChannelId}
                onChannelSelect={onChannelSelect}
                emptyLabel="No groups yet"
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatSection({
  title,
  channels,
  currentChannelId,
  onChannelSelect,
  emptyLabel,
}: {
  title: string;
  channels: MessageChannel[];
  currentChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  emptyLabel: string;
}) {
  return (
    <section className="space-y-1">
      <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {channels.length === 0 ? (
        <p className="px-2 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        channels.map((channel) => {
          const direct = isDirectChat(channel);
          return (
            <button
              key={channel.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                currentChannelId === channel.id
                  ? "bg-primary/10"
                  : "hover:bg-muted",
              )}
              onClick={() => onChannelSelect(channel.id)}
              aria-pressed={currentChannelId === channel.id}
              aria-label={`Open chat with ${channel.name}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {direct ? (
                  <span className="text-sm font-medium text-foreground">
                    {(channel.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{channel.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {direct ? "Direct message" : "Group"}
                </p>
              </div>
              {channel.unread_count && channel.unread_count > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {channel.unread_count}
                </Badge>
              ) : null}
            </button>
          );
        })
      )}
    </section>
  );
}
