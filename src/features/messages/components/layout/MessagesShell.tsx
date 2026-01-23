import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagesMainArea, MessagesSidebar } from '@/features/messages/components/layout';
import {
  AnimatedChannelWizard,
  ChannelMembers,
  ChannelSettings,
  DirectMessageDialog,
  MessageSearch,
} from '@/features/messages/components/modals';
import { ThreadedMessageView } from '@/components/messages/ThreadedMessageView';
import { VideoCallDialog } from '@/components/messages/VideoCallDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Sparkles } from 'lucide-react';
import { HelpDeskPanel } from '@/features/messages/components/helpdesk/HelpDeskPanel';
import { InventorySignalWidget } from '@/features/messages/components/ops/InventorySignalWidget';
import type { MessagesViewModel } from '../hooks/useMessagesViewModel';

interface MessagesShellProps {
  viewModel: MessagesViewModel;
  organizationId?: string | null;
  organizationName?: string | null;
}

interface MessagesSubSectionProps {
  vm: MessagesViewModel;
}

export function MessagesShell({
  viewModel: vm,
  organizationId,
  organizationName,
}: MessagesShellProps) {
  const [helpDeskOpen, setHelpDeskOpen] = useState(vm.activeFilter === 'helpdesk');

  useEffect(() => {
    if (vm.activeFilter === 'helpdesk') {
      setHelpDeskOpen(true);
    }
  }, [vm.activeFilter]);

  const handleHelpDeskToggle = () => {
    setHelpDeskOpen((prev) => {
      const next = !prev;
      if (next) {
        vm.setActiveFilter('helpdesk');
      } else if (vm.activeFilter === 'helpdesk') {
        vm.setActiveFilter('all');
      }
      return next;
    });
  };

  if (vm.loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4">
        <div className="rounded-3xl border bg-background px-6 py-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-xl border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your conversations…</p>
        </div>
      </div>
    );
  }

  if (vm.isMobile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-6">
        <div className="space-y-4">
          <WorkspaceHeader vm={vm} helpDeskActive={helpDeskOpen} onHelpDeskToggle={handleHelpDeskToggle} />
          <div className="rounded-3xl border bg-background/95 shadow-sm">
            <MobileLayout vm={vm} />
          </div>
          <AnimatePresence>
            {helpDeskOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border bg-background/95 p-4 shadow-sm"
              >
                <HelpDeskPanel
                  companyId={organizationId}
                  organizationName={organizationName}
                  onClose={() => setHelpDeskOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <PortalContent vm={vm} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-0">
        <WorkspaceHeader vm={vm} helpDeskActive={helpDeskOpen} onHelpDeskToggle={handleHelpDeskToggle} />

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <ChannelColumn vm={vm} />
          <ConversationColumn vm={vm} />
          <OperationsColumn
            helpDeskOpen={helpDeskOpen}
            onToggleHelpDesk={handleHelpDeskToggle}
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      </div>

      <PortalContent vm={vm} />
    </div>
  );
}

function WorkspaceHeader({
  vm,
  helpDeskActive,
  onHelpDeskToggle,
}: MessagesSubSectionProps & {
  helpDeskActive: boolean;
  onHelpDeskToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-background/95 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Flow
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Communication Workbench</h1>
        <p className="text-sm text-muted-foreground">
          Minimal board for channels, direct messages, announcements, and support.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size={vm.isMobile ? 'sm' : 'default'} onClick={() => vm.setShowDirectMessageDialog(true)}>
          Start DM
        </Button>
        <Button size={vm.isMobile ? 'sm' : 'default'} onClick={() => vm.setShowCreateDialog(true)}>
          New Channel
        </Button>
        <Button
          size={vm.isMobile ? 'sm' : 'default'}
          variant={helpDeskActive ? 'default' : 'outline'}
          className="gap-2"
          onClick={onHelpDeskToggle}
        >
          <LifeBuoy className="h-4 w-4" />
          Help Desk
        </Button>
      </div>
    </div>
  );
}

function ChannelColumn({ vm }: MessagesSubSectionProps) {
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

function ConversationColumn({ vm }: MessagesSubSectionProps) {
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
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Ops</p>
            <h3 className="text-lg font-semibold">Support + Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Surface help tickets and low-stock stories beside conversations.
            </p>
          </div>
          <Badge variant={helpDeskOpen ? 'default' : 'outline'}>{helpDeskOpen ? 'Help Desk on' : 'Help Desk off'}</Badge>
        </div>
        <Button className="mt-4 w-full" variant={helpDeskOpen ? 'outline' : 'default'} onClick={onToggleHelpDesk}>
          {helpDeskOpen ? 'Hide Help Desk' : 'Open Help Desk'}
        </Button>
      </div>

      <AnimatePresence initial={false}>
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
      </AnimatePresence>

      <InventorySignalWidget />
    </motion.div>
  );
}

function MobileLayout({ vm }: MessagesSubSectionProps) {
  return (
    <>
      {vm.showMobileSidebar && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => vm.setShowMobileSidebar(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[90vw] sm:w-72 transform border-r border-border/50 bg-background/95 transition-transform duration-300 ease-in-out ${
          vm.showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
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
          currentUserId={vm.profile?.id ?? null}
          onDeleteMessage={vm.handleDeleteMessage}
        />
      </div>
    </>
  );
}

function PortalContent({ vm }: MessagesSubSectionProps) {
  const videoCallParticipants = useMemo(
    () => [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
      { id: '3', name: 'Mike Johnson' },
    ],
    [],
  );
  return (
    <>
      {vm.showCreateDialog && (
        <AnimatedChannelWizard open={vm.showCreateDialog} onClose={() => vm.setShowCreateDialog(false)} />
      )}

      {vm.showDirectMessageDialog && (
        <DirectMessageDialog open={vm.showDirectMessageDialog} onClose={() => vm.setShowDirectMessageDialog(false)} />
      )}

      {vm.showChannelMembers && vm.currentChannel && (
        <ChannelMembers
          open={vm.showChannelMembers}
          onClose={() => vm.setShowChannelMembers(false)}
          channelId={vm.currentChannel.id}
          channelName={vm.currentChannel.name}
        />
      )}

      {vm.showChannelSettings && vm.currentChannel && (
        <ChannelSettings
          open={vm.showChannelSettings}
          onClose={() => vm.setShowChannelSettings(false)}
          channel={vm.currentChannel}
          onChannelUpdated={vm.handleChannelUpdated}
          onDeleteChannel={vm.handleDeleteChannel}
        />
      )}

      {vm.showMessageSearch && (
        <MessageSearch open={vm.showMessageSearch} onClose={() => vm.setShowMessageSearch(false)} />
      )}

      {vm.showCreateAnnouncement && (
        <CreateAnnouncement open={vm.showCreateAnnouncement} onClose={() => vm.setShowCreateAnnouncement(false)} />
      )}

      {vm.isVideoCallOpen && vm.currentChannel && vm.callType && (
        <VideoCallDialog
          isOpen={vm.isVideoCallOpen}
          onClose={vm.handleCloseVideoCall}
          channelName={vm.currentChannel.name}
          participants={videoCallParticipants}
          callType={vm.callType}
        />
      )}

      {vm.isThreadOpen && vm.threadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="h-[600px] w-full max-w-2xl rounded-2xl bg-background shadow-xl">
            <ThreadedMessageView
              message={vm.threadMessage}
              allReplies={[]}
              onClose={vm.closeThread}
              onSendReply={() => {
                // placeholder - wired up later.
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function isChannelAdmin(vm: MessagesViewModel) {
  if (!vm.currentChannel || !vm.profile) return false;
  const role = (vm.profile.role ?? '').toLowerCase();
  return vm.currentChannel.created_by === vm.profile.id || ['admin', 'owner', 'company_admin'].includes(role);
}
