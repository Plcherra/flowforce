import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";
import type { MessageChannel } from "@/types/messages";
import { chatIsUnread, directChatTitle } from "@/features/messages/channelScope";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";
import { MessagesMainArea } from "./MessagesMainArea";
import { NewChatPanel } from "./NewChatPanel";

interface MessagesBoardProps {
  vm: MessagesViewModel;
}

function isDirect(channel: MessageChannel) {
  return (channel.type ?? "").toLowerCase() === "direct";
}

function isChannelAdmin(vm: MessagesViewModel) {
  if (!vm.currentChannel || !vm.profile) return false;
  const role = (vm.profile.role ?? "").toLowerCase();
  return (
    vm.currentChannel.created_by === vm.profile.id ||
    ["admin", "owner", "company_admin"].includes(role)
  );
}

export function MessagesBoard({ vm }: MessagesBoardProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold">{t("common.messages")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("messages.chatsWithPeopleAndGroupsOnYourTeam")} </p>
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor="message-roster-search" className="sr-only">
            {t("messages.searchChats")} </Label>
          <Input
            id="message-roster-search"
            value={vm.query}
            onChange={(event) => vm.setQuery(event.target.value)}
            placeholder={t("nav.search")}
          />
        </div>
        <Button variant="ghost" asChild>
          <Link to="/app/company-updates">{t("common.companyUpdates")}</Link>
        </Button>
        <Button
          variant={vm.showDirectMessageDialog ? "default" : "outline"}
          data-testid="new-chat"
          onClick={() => {
            vm.closeThread();
            vm.setShowDirectMessageDialog(true);
          }}
        >
          {t("messages.newChat")} </Button>
      </div>

      {vm.filteredChannels.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {vm.filteredChannels.map((channel) => {
            const active =
              !vm.showDirectMessageDialog && vm.currentChannelId === channel.id;
            const title = directChatTitle(
              channel,
              vm.profile?.id,
              t("messages.teamMember"),
            );
            const unread = chatIsUnread(
              channel,
              vm.profile?.id,
              vm.currentChannelId,
            );
            return (
              <button
                key={channel.id}
                type="button"
                data-testid="chat-channel"
                data-channel-name={title}
                onClick={() => {
                  vm.setShowDirectMessageDialog(false);
                  vm.setCurrentChannelId(channel.id);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "bg-background hover:border-foreground/40",
                )}
              >
                {isDirect(channel) ? title : t("messages.groupChip", { name: title })}
                {unread ? (
                  <span
                    className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                    aria-label={t("messages.unreadChat")}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-background shadow-sm sm:mx-6">
        {vm.showDirectMessageDialog ? (
          <NewChatPanel
            onClose={() => vm.setShowDirectMessageDialog(false)}
            onPickUser={vm.startDirectChat}
            onStartGroup={vm.startGroupChat}
          />
        ) : (
          <MessagesMainArea
            channel={vm.currentChannel}
            messages={vm.messages}
            messagesLoading={vm.loading}
            isChannelAdmin={isChannelAdmin(vm)}
            onShowChannelMembers={() => vm.setShowChannelMembers(true)}
            onShowChannelSettings={() => vm.setShowChannelSettings(true)}
            onSendMessage={vm.handleSendMessage}
            onThreadMessage={vm.handleThreadMessage}
            currentUserId={vm.profile?.id ?? null}
            onDeleteMessage={vm.handleDeleteMessage}
            onUpdateMessage={vm.handleUpdateMessage}
          />
        )}
      </div>
    </div>
  );
}
