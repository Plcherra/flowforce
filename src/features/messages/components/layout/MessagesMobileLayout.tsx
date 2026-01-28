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
  return (
    <>
      {vm.showMobileSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => vm.setShowMobileSidebar(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[90vw] sm:w-72 transform border-r border-border/50 bg-background/95 transition-transform duration-300 ease-in-out ${
          vm.showMobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <MessagesSidebar
          channels={vm.filteredChannels}
          currentChannelId={vm.currentChannelId}
          onChannelSelect={vm.setCurrentChannelId}
          onShowCreateDialog={() => vm.setShowCreateDialog(true)}
          onShowDirectMessageDialog={() => vm.setShowDirectMessageDialog(true)}
          onShowMessageSearch={() => vm.setShowMessageSearch(true)}
          onShowCreateAnnouncement={() => vm.setShowCreateAnnouncement(true)}
          activeFilter={vm.activeFilter}
          onFilterChange={vm.setActiveFilter}
          query={vm.query}
          onQueryChange={vm.setQuery}
          canShowAvailability={vm.canToggleAvailability}
          available={vm.available}
          onToggleAvailable={vm.handleAvailabilityChange}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <MessagesMainArea
          channel={vm.currentChannel}
          messages={vm.messages}
          messagesLoading={vm.loading}
          isChannelAdmin={isChannelAdmin(vm)}
          onShowChannelMembers={() => vm.setShowChannelMembers(true)}
          onShowChannelSettings={() => vm.setShowChannelSettings(true)}
          onStartVideoCall={vm.handleStartVideoCall}
          onScheduleMessage={vm.handleScheduleMessage}
          onSendMessage={vm.handleSendMessage}
          onThreadMessage={vm.handleThreadMessage}
          onShowCreateDialog={() => vm.setShowCreateDialog(true)}
          isMobile={vm.isMobile}
          currentUserId={vm.profile?.id ?? null}
          onDeleteMessage={vm.handleDeleteMessage}
          onUpdateMessage={vm.handleUpdateMessage}
          showMobileSidebar={vm.showMobileSidebar}
          onToggleMobileSidebar={() => vm.setShowMobileSidebar((prev) => !prev)}
          canShowAvailability={vm.canToggleAvailability}
          available={vm.available}
          onToggleAvailable={vm.handleAvailabilityChange}
        />
      </div>
    </>
  );
}
