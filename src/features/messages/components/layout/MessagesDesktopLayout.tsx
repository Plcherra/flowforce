import React from "react";
import { motion } from "framer-motion";
import { MessagesSidebar } from "./MessagesSidebar";
import { MessagesMainArea } from "./MessagesMainArea";
import { InventorySignalWidget } from "../../components/ops/InventorySignalWidget";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesDesktopLayoutProps {
  vm: MessagesViewModel;
}

export function MessagesDesktopLayout({ vm }: MessagesDesktopLayoutProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <ChannelColumn vm={vm} />
      <ConversationColumn vm={vm} />
      <OperationsColumn />
    </div>
  );
}

function ChannelColumn({ vm }: { vm: MessagesViewModel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-3xl border bg-background/95 shadow-sm"
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
    </motion.div>
  );
}

function ConversationColumn({ vm }: { vm: MessagesViewModel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl border bg-background/95 shadow-sm"
    >
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
        showMobileSidebar={vm.showMobileSidebar}
        onToggleMobileSidebar={() => vm.setShowMobileSidebar((prev) => !prev)}
        canShowAvailability={vm.canToggleAvailability}
        available={vm.available}
        onToggleAvailable={vm.handleAvailabilityChange}
        currentUserId={vm.profile?.id ?? null}
        onDeleteMessage={vm.handleDeleteMessage}
        onUpdateMessage={vm.handleUpdateMessage}
      />
    </motion.div>
  );
}

function OperationsColumn() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Ops
          </p>
          <h3 className="text-lg font-semibold">Inventory signals</h3>
          <p className="text-sm text-muted-foreground">
            Surface low-stock stories beside conversations.
          </p>
        </div>
      </div>

      <InventorySignalWidget />
    </motion.div>
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
