import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { AnimatedChannelWizard } from '@/components/messages/AnimatedChannelWizard';
import { ChannelMembers } from '@/components/messages/ChannelMembers';
import { ChannelSettings } from '@/components/messages/ChannelSettings';
import { CreateAnnouncement } from '@/components/announcements/CreateAnnouncement';
import { DirectMessageDialog } from '@/components/messages/DirectMessageDialog';
import { MessageSearch } from '@/components/messages/MessageSearch';
import { MessagesMainArea } from '@/components/messages/MessagesMainArea';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { ThreadedMessageView } from '@/components/messages/ThreadedMessageView';
import { VideoCallDialog } from '@/components/messages/VideoCallDialog';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/hooks/messages/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import type { MessageAttachment, ThreadMessage } from '@/types/messages';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export default function Messages() {
  const {
    channels,
    messages,
    loading,
    currentChannelId,
    setCurrentChannelId,
    sendMessage,
    updateLastRead,
  } = useMessages();
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');

  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(null);
  const [showThread, setShowThread] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(300);

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'teams' | 'helpdesk'>('all');
  const [query, setQuery] = useState('');
  const [available, setAvailable] = useState(false);

  const currentChannel = useMemo(
    () => channels.find((channel) => channel.id === currentChannelId) ?? null,
    [channels, currentChannelId],
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const flag = (data.user?.user_metadata as Record<string, unknown>)?.availability;
        if (typeof flag === 'boolean') {
          setAvailable(flag);
        }
      } catch (error) {
        logger.error?.('Failed to load availability flag', error);
      }
    })();
  }, []);

  const canToggleAvailability = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase();
    return ['supervisor', 'manager', 'admin', 'owner', 'company_admin'].includes(role);
  }, [profile?.role]);

  const filteredChannels = useMemo(() => {
    const uid = profile?.id;
    let list = channels.slice();

    if (activeFilter === 'unread') {
      list = list.filter((channel) => {
        const me = channel.channel_members?.find((member) => member.user_id === uid);
        if (!me?.last_read_at) return true;
        return new Date(channel.updated_at) > new Date(me.last_read_at);
      });
    }

    if (activeFilter === 'teams') {
      list = list.filter((channel) => channel.type !== 'direct');
    }

    if (activeFilter === 'helpdesk') {
      list = list.filter(
        (channel) =>
          (channel.type ?? '').toLowerCase() === 'helpdesk' ||
          channel.name.toLowerCase().includes('help'),
      );
    }

    if (query.trim()) {
      const keyword = query.toLowerCase();
      list = list.filter((channel) =>
        `${channel.name} ${channel.description ?? ''}`.toLowerCase().includes(keyword),
      );
    }

    return list;
  }, [channels, activeFilter, query, profile?.id]);

  useEffect(() => {
    if (channels.length > 0 && !currentChannelId) {
      setCurrentChannelId(channels[0].id);
    }
  }, [channels, currentChannelId, setCurrentChannelId]);

  useEffect(() => {
    if (currentChannelId && isMobile) {
      setShowMobileSidebar(false);
    }
  }, [currentChannelId, isMobile]);

  useEffect(() => {
    if (currentChannelId) {
      updateLastRead(currentChannelId);
    }
  }, [currentChannelId, updateLastRead]);

  const handleAvailabilityChange = useCallback(async (value: boolean) => {
    setAvailable(value);
    try {
      await supabase.auth.updateUser({ data: { availability: value } });
    } catch (error) {
      logger.error?.('Failed to update availability status', error);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, attachments: MessageAttachment[]) => {
      if (!currentChannelId) return;
      const { error } = await sendMessage(currentChannelId, content, {
        attachments,
      });

      if (error) {
        logger.error?.('Failed to send message', error);
        toast({
          title: 'Unable to send message',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [currentChannelId, sendMessage, toast],
  );

  const handleStartVideoCall = useCallback((type: 'video' | 'audio') => {
    setCallType(type);
    setShowVideoCall(true);
  }, []);

  const handleScheduleMessage = useCallback((content: string, scheduledFor: Date) => {
    logger.debug('Scheduled message:', content, 'for', scheduledFor);
  }, []);

  const handleThreadMessage = useCallback((message: ThreadMessage) => {
    setThreadMessage(message);
    setShowThread(true);
  }, []);

  const isChannelAdmin = useMemo(() => {
    if (!currentChannel || !profile) return false;
    const role = (profile.role ?? '').toLowerCase();
    return (
      currentChannel.created_by === profile.id ||
      ['admin', 'owner', 'company_admin'].includes(role)
    );
  }, [currentChannel, profile]);

  const containerSpacing = isMobile ? 'px-4 py-4 space-y-4' : 'px-6 py-6 space-y-6';

  if (loading) {
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Team Messages</h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Coordinate with your team across channels, threads, and announcements.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size={isMobile ? 'sm' : 'default'}
                onClick={() => setShowDirectMessageDialog(true)}
              >
                Start DM
              </Button>
              <Button size={isMobile ? 'sm' : 'default'} onClick={() => setShowCreateDialog(true)}>
                New Channel
              </Button>
            </div>
          </div>

          <div className="relative flex flex-1 min-h-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-4 z-20"
                onClick={() => setShowMobileSidebar((prev) => !prev)}
              >
                {showMobileSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}

            {isMobile && showMobileSidebar && (
              <div
                className="fixed inset-0 z-30 bg-black/50"
                onClick={() => setShowMobileSidebar(false)}
              />
            )}

            {isMobile ? (
              <>
                <div
                  className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-card transition-transform duration-300 ease-in-out ${
                    showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
                  }`}
                >
                  <MessagesSidebar
                    channels={filteredChannels}
                    currentChannelId={currentChannelId}
                    onChannelSelect={setCurrentChannelId}
                    onShowCreateDialog={() => setShowCreateDialog(true)}
                    onShowDirectMessageDialog={() => setShowDirectMessageDialog(true)}
                    onShowMessageSearch={() => setShowMessageSearch(true)}
                    onShowCreateAnnouncement={() => setShowCreateAnnouncement(true)}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    query={query}
                    onQueryChange={setQuery}
                    canShowAvailability={canToggleAvailability}
                    available={available}
                    onToggleAvailable={handleAvailabilityChange}
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <MessagesMainArea
                    channel={currentChannel}
                    messages={messages}
                    messagesLoading={loading}
                    isChannelAdmin={isChannelAdmin}
                    onShowChannelMembers={() => setShowChannelMembers(true)}
                    onShowChannelSettings={() => setShowChannelSettings(true)}
                    onStartVideoCall={handleStartVideoCall}
                    onScheduleMessage={handleScheduleMessage}
                    onSendMessage={handleSendMessage}
                    onThreadMessage={handleThreadMessage}
                    onShowCreateDialog={() => setShowCreateDialog(true)}
                    isMobile={isMobile}
                    showMobileSidebar={showMobileSidebar}
                    onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
                    filter={activeFilter}
                    onChangeFilter={setActiveFilter}
                    canShowAvailability={canToggleAvailability}
                    available={available}
                    onToggleAvailable={handleAvailabilityChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full flex-1">
                <div className="relative h-full border-r" style={{ width: sidebarWidth, minWidth: 240, maxWidth: 340 }}>
                  <MessagesSidebar
                    channels={filteredChannels}
                    currentChannelId={currentChannelId}
                    onChannelSelect={setCurrentChannelId}
                    onShowCreateDialog={() => setShowCreateDialog(true)}
                    onShowDirectMessageDialog={() => setShowDirectMessageDialog(true)}
                    onShowMessageSearch={() => setShowMessageSearch(true)}
                    onShowCreateAnnouncement={() => setShowCreateAnnouncement(true)}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    query={query}
                    onQueryChange={setQuery}
                    canShowAvailability={canToggleAvailability}
                    available={available}
                    onToggleAvailable={handleAvailabilityChange}
                  />
                </div>
                <div
                  className="group relative hidden h-full w-px shrink-0 cursor-col-resize items-stretch lg:flex after:absolute after:inset-y-0 after:-left-[3px] after:w-4 after:cursor-col-resize after:content-['']"
                  onMouseDown={(event) => {
                    const startX = event.clientX;
                    const start = sidebarWidth;
                    const handleMove = (moveEvent: MouseEvent) => {
                      const delta = moveEvent.clientX - startX;
                      const next = Math.min(Math.max(start + delta, 240), 340);
                      setSidebarWidth(next);
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
                    channel={currentChannel}
                    messages={messages}
                    messagesLoading={loading}
                    isChannelAdmin={isChannelAdmin}
                    onShowChannelMembers={() => setShowChannelMembers(true)}
                    onShowChannelSettings={() => setShowChannelSettings(true)}
                    onStartVideoCall={handleStartVideoCall}
                    onScheduleMessage={handleScheduleMessage}
                    onSendMessage={handleSendMessage}
                    onThreadMessage={handleThreadMessage}
                    onShowCreateDialog={() => setShowCreateDialog(true)}
                    isMobile={isMobile}
                    showMobileSidebar={showMobileSidebar}
                    onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
                    filter={activeFilter}
                    onChangeFilter={setActiveFilter}
                    canShowAvailability={canToggleAvailability}
                    available={available}
                    onToggleAvailable={handleAvailabilityChange}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateDialog && (
        <AnimatedChannelWizard open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      )}

      {showDirectMessageDialog && (
        <DirectMessageDialog open={showDirectMessageDialog} onClose={() => setShowDirectMessageDialog(false)} />
      )}

      {showChannelMembers && currentChannel && (
        <ChannelMembers
          open={showChannelMembers}
          onClose={() => setShowChannelMembers(false)}
          channelId={currentChannel.id}
          channelName={currentChannel.name}
        />
      )}

      {showChannelSettings && currentChannel && (
        <ChannelSettings open={showChannelSettings} onClose={() => setShowChannelSettings(false)} channel={currentChannel} />
      )}

      {showMessageSearch && (
        <MessageSearch open={showMessageSearch} onClose={() => setShowMessageSearch(false)} />
      )}

      {showCreateAnnouncement && (
        <CreateAnnouncement open={showCreateAnnouncement} onClose={() => setShowCreateAnnouncement(false)} />
      )}

      {showVideoCall && currentChannel && (
        <VideoCallDialog
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          channelName={currentChannel.name}
          participants={[
            { id: '1', name: 'John Doe' },
            { id: '2', name: 'Jane Smith' },
            { id: '3', name: 'Mike Johnson' },
          ]}
          callType={callType}
        />
      )}

      {showThread && threadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="h-[600px] w-full max-w-2xl rounded-lg bg-background shadow-xl">
            <ThreadedMessageView
              message={threadMessage}
              allReplies={[]}
              onClose={() => setShowThread(false)}
              onSendReply={(content, parentId) => {
                logger.debug('Send thread reply:', content, 'to', parentId);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
