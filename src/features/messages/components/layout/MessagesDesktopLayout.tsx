import React from "react";
import { motion } from "framer-motion";
import { MessagesSidebar } from "./MessagesSidebar";
import { MessagesMainArea } from "./MessagesMainArea";
import { HelpDeskPanel } from "../../components/helpdesk/HelpDeskPanel";
import { InventorySignalWidget } from "../../components/ops/InventorySignalWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesDesktopLayoutProps {
  vm: MessagesViewModel;
  helpDeskOpen: boolean;
  onToggleHelpDesk: () => void;
  organizationId?: string | null;
  organizationName?: string | null;
}

export function MessagesDesktopLayout({
  vm,
  helpDeskOpen,
  onToggleHelpDesk,
  organizationId,
  organizationName,
}: MessagesDesktopLayoutProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <ChannelColumn vm={vm} />
      <ConversationColumn vm={vm} />
      <OperationsColumn
        helpDeskOpen={helpDeskOpen}
        onToggleHelpDesk={onToggleHelpDesk}
        organizationId={organizationId}
        organizationName={organizationName}
      />
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

function OperationsColumn({
  helpDeskOpen,
  onToggleHelpDesk,
  organizationId,
  organizationName,
}: {
  helpDeskOpen: boolean;
  onToggleHelpDesk: () => void;
  organizationId?: string | null;
  organizationName?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Ops
            </p>
            <h3 className="text-lg font-semibold">Support + Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Surface help tickets and low-stock stories beside conversations.
            </p>
          </div>
          <Badge variant={helpDeskOpen ? "default" : "outline"}>
            {helpDeskOpen ? "Help Desk on" : "Help Desk off"}
          </Badge>
        </div>
        <Button
          className="mt-4 w-full"
          variant={helpDeskOpen ? "outline" : "default"}
          onClick={onToggleHelpDesk}
        >
          {helpDeskOpen ? "Hide Help Desk" : "Open Help Desk"}
        </Button>
      </div>

      {helpDeskOpen && (
        <motion.div
          key="helpdesk-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
        >
          <HelpDeskPanel
            companyId={organizationId}
            organizationName={organizationName}
            onClose={onToggleHelpDesk}
          />
        </motion.div>
      )}

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
