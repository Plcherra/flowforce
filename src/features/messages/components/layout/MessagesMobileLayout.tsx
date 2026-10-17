import React from "react";
import { MessagesSidebar } from "./MessagesSidebar";
import { MessagesMainArea } from "./MessagesMainArea";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesMobileLayoutProps {
  vm: MessagesViewModel;
}

function isChannelAdmin(vm: MessagesViewModel) {
  if (!vm.currentChannel || !vm.profile) return false;
  const role = (vm.profile.role ?? "").toLowerCase();
  return (
    vm.currentChannel.created_by === vm.profile.id ||
    ["admin", "owner", "company_admin"].includes(role)
  );
}

export function MessagesMobileLayout({ vm }: MessagesMobileLayoutProps) {
  const showList = !vm.currentChannel || vm.showMobileSidebar;

  if (showList) {
    return (
      <div className="min-h-0 flex-1">
        <MessagesSidebar
          channels={vm.filteredChannels}
          currentChannelId={vm.currentChannelId}
          onChannelSelect={(channelId) => {
            vm.setCurrentChannelId(channelId);
            vm.setShowMobileSidebar(false);
          }}
          onShowCreateDialog={() => vm.setShowCreateDialog(true)}
          onShowDirectMessageDialog={() => vm.setShowDirectMessageDialog(true)}
          query={vm.query}
          onQueryChange={vm.setQuery}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessagesMainArea
        channel={vm.currentChannel}
        messages={vm.messages}
        messagesLoading={vm.loading}
        isChannelAdmin={isChannelAdmin(vm)}
        onShowChannelMembers={() => vm.setShowChannelMembers(true)}
        onShowChannelSettings={() => vm.setShowChannelSettings(true)}
        onSendMessage={vm.handleSendMessage}
        onThreadMessage={vm.handleThreadMessage}
        isMobile
        onBack={() => vm.setShowMobileSidebar(true)}
        currentUserId={vm.profile?.id ?? null}
        onDeleteMessage={vm.handleDeleteMessage}
        onUpdateMessage={vm.handleUpdateMessage}
      />
    </div>
  );
}
