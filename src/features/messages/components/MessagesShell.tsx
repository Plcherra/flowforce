import React from 'react';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { CreateAnnouncement } from '@/components/announcements/CreateAnnouncement';
import { AnimatedChannelWizard } from '@/components/messages/AnimatedChannelWizard';
import { ChannelMembers } from '@/components/messages/ChannelMembers';
import { ChannelSettings } from '@/components/messages/ChannelSettings';
import { DirectMessageDialog } from '@/components/messages/DirectMessageDialog';
import { MessageSearch } from '@/components/messages/MessageSearch';
import { MessagesMainArea } from '@/components/messages/MessagesMainArea';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { ThreadedMessageView } from '@/components/messages/ThreadedMessageView';
import { VideoCallDialog } from '@/components/messages/VideoCallDialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import type { MessagesViewModel } from '../hooks/useMessagesViewModel';

interface MessagesShellProps {
  viewModel: MessagesViewModel;
}

interface MessagesSubSectionProps {
  vm: MessagesViewModel;
}

export function MessagesShell({ viewModel: vm }: MessagesShellProps) {
  const containerSpacing = vm.isMobile ? 'px-4 py-4 space-y-4' : 'px-6 py-6 space-y-6';

  if (vm.loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4">
        <div className="rounded-2xl border bg-background px-6 py-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your conversations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/20">
      <div className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <AnnouncementBanner />
        </div>
      </div>

      <div className="flex-1">
        <div className={`mx-auto flex h-full w-full max-w-7xl flex-col ${containerSpacing}`}>
          <MessagesHeader vm={vm} />
          {vm.isMobile ? <MobileLayout vm={vm} /> : <DesktopLayout vm={vm} />}
        </div>
      </div>

      <PortalContent vm={vm} />
    </div>
  );
}

function MessagesHeader({ vm }: MessagesSubSectionProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Team Messages</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Coordinate with your team across channels, threads, and announcements.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size={vm.isMobile ? 'sm' : 'default'} onClick={() => vm.setShowDirectMessageDialog(true)}>
          Start DM
        </Button>
        <Button size={vm.isMobile ? 'sm' : 'default'} onClick={() => vm.setShowCreateDialog(true)}>
          New Channel
        </Button>
      </div>
    </div>
  );
}

function MobileLayout({ vm }: MessagesSubSectionProps) {
  return (
    <>
      {vm.showMobileSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => vm.setShowMobileSidebar(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-card transition-transform duration-300 ease-in-out ${
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
          showMobileSidebar={vm.showMobileSidebar}
          onToggleMobileSidebar={() => vm.setShowMobileSidebar((prev) => !prev)}
          filter={vm.activeFilter}
          onChangeFilter={vm.setActiveFilter}
          canShowAvailability={vm.canToggleAvailability}
          available={vm.available}
          onToggleAvailable={vm.handleAvailabilityChange}
        />
      </div>
    </>
  );
}

function DesktopLayout({ vm }: MessagesSubSectionProps) {
  return (
    <div className="flex h-full flex-1">
      <div className="relative h-full border-r" style={{ width: vm.sidebarWidth, minWidth: 240, maxWidth: 340 }}>
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
      <div
        className="group relative hidden h-full w-px shrink-0 cursor-col-resize items-stretch lg:flex after:absolute after:inset-y-0 after:-left-[3px] after:w-4 after:cursor-col-resize after:content-['']"
        onMouseDown={(event) => {
          const startX = event.clientX;
          const start = vm.sidebarWidth;
          const handleMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            const next = Math.min(Math.max(start + delta, 240), 340);
            vm.setSidebarWidth(next);
          };
          const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
          };
          window.addEventListener('mousemove', handleMove);
          window.addEventListener('mouseup', handleUp);
        }}
      >
        <span className="mx-auto h-full w-px rounded bg-neutral-200 transition-colors duration-200 group-hover:bg-neutral-300 group-active:bg-neutral-300" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
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
          filter={vm.activeFilter}
          onChangeFilter={vm.setActiveFilter}
          canShowAvailability={vm.canToggleAvailability}
          available={vm.available}
          onToggleAvailable={vm.handleAvailabilityChange}
        />
      </div>
    </div>
  );
}

function PortalContent({ vm }: MessagesSubSectionProps) {
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
        <ChannelSettings open={vm.showChannelSettings} onClose={() => vm.setShowChannelSettings(false)} channel={vm.currentChannel} />
      )}

      {vm.showMessageSearch && (
        <MessageSearch open={vm.showMessageSearch} onClose={() => vm.setShowMessageSearch(false)} />
      )}

      {vm.showCreateAnnouncement && (
        <CreateAnnouncement open={vm.showCreateAnnouncement} onClose={() => vm.setShowCreateAnnouncement(false)} />
      )}

      {vm.showVideoCall && vm.currentChannel && (
        <VideoCallDialog
          isOpen={vm.showVideoCall}
          onClose={() => vm.setShowVideoCall(false)}
          channelName={vm.currentChannel.name}
          participants={[
            { id: '1', name: 'John Doe' },
            { id: '2', name: 'Jane Smith' },
            { id: '3', name: 'Mike Johnson' },
          ]}
          callType={vm.callType}
        />
      )}

      {vm.showThread && vm.threadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="h-[600px] w-full max-w-2xl rounded-lg bg-background shadow-xl">
            <ThreadedMessageView
              message={vm.threadMessage}
              allReplies={[]}
              onClose={() => vm.setShowThread(false)}
              onSendReply={(content, parentId) => {
                logger.debug('Send thread reply:', content, 'to', parentId);
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
