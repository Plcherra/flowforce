import React from "react";
import { MessagesSidebar } from "./MessagesSidebar";
import { MessagesMainArea } from "./MessagesMainArea";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesDesktopLayoutProps {
  vm: MessagesViewModel;
}

export function MessagesDesktopLayout({ vm }: MessagesDesktopLayoutProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-h-0 border-r">
        <MessagesSidebar
          channels={vm.filteredChannels}
          currentChannelId={vm.currentChannelId}
          onChannelSelect={vm.setCurrentChannelId}
          onShowCreateDialog={() => vm.setShowCreateDialog(true)}
          onShowDirectMessageDialog={() => vm.setShowDirectMessageDialog(true)}
          query={vm.query}
          onQueryChange={vm.setQuery}
        />
      </aside>
      <section className="min-h-0">
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
      </section>
    </div>
  );
}

function isChannelAdmin(vm: MessagesViewModel) {
  if (!vm.currentChannel || !vm.profile) return false;
  const role = (vm.profile.role ?? "").toLowerCase();
  return (
    vm.currentChannel.created_by === vm.profile.id ||
    ["admin", "owner", "company_admin"].includes(role)
  );
}
