import React, { useState, useEffect, useMemo } from 'react';
import { useMessages } from '@/hooks/messages/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedChannelWizard } from '@/components/messages/AnimatedChannelWizard';
import { DirectMessageDialog } from '@/components/messages/DirectMessageDialog';
import { ChannelMembers } from '@/components/messages/ChannelMembers';
import { ChannelSettings } from '@/components/messages/ChannelSettings';
import { MessageSearch } from '@/components/messages/MessageSearch';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { VideoCallDialog } from '@/components/messages/VideoCallDialog';
import { ThreadedMessageView } from '@/components/messages/ThreadedMessageView';
import { CreateAnnouncement } from '@/components/announcements/CreateAnnouncement';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { MessagesMainArea } from '@/components/messages/MessagesMainArea';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import type { ThreadMessage, MessageAttachment } from '@/types/messages';
import { MessageFilterBar } from '@/components/MessageFilterBar';
import { Input } from '@/components/ui/input';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
    searchMessages
  } = useMessages();
  
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Mobile sidebar state
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  
  // Video call states
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  
  // Thread states
  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(null);
  const [showThread, setShowThread] = useState(false);
  
  // Search states
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  // Sidebar width for desktop (draggable) — keep before any early returns
  const [sidebarWidth, setSidebarWidth] = useState<number>(300);

  const currentChannel = channels.find(c => c.id === currentChannelId);

  // Top-level filter, search, availability
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'teams' | 'helpdesk'>('all');
  const [query, setQuery] = useState('');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const flag = (data.user?.user_metadata as any)?.availability;
      if (typeof flag === 'boolean') setAvailable(flag);
    })();
  }, []);

  const filteredChannels = useMemo(() => {
    const uid = profile?.id;
    let list = channels.slice();
    if (activeFilter === 'unread') {
      list = list.filter((ch) => {
        const me = ch.channel_members?.find(m => m.user_id === uid);
        if (!me?.last_read_at) return true; // never read
        return new Date(ch.updated_at) > new Date(me.last_read_at);
      });
    }
    if (activeFilter === 'teams') {
      list = list.filter((ch) => ch.type !== 'direct');
    }
    if (activeFilter === 'helpdesk') {
      list = list.filter((ch) => (ch.type || '').toLowerCase() === 'helpdesk' || ch.name.toLowerCase().includes('help'));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((ch) => `${ch.name} ${ch.description || ''}`.toLowerCase().includes(q));
    }
    return list;
  }, [channels, activeFilter, query, profile?.id]);

  // Auto-select first channel and close mobile sidebar
  useEffect(() => {
    if (channels.length > 0 && !currentChannelId) {
      setCurrentChannelId(channels[0].id);
    }
  }, [channels]);

  // Close mobile sidebar when channel is selected
  useEffect(() => {
    if (currentChannelId && isMobile) {
      setShowMobileSidebar(false);
    }
  }, [currentChannelId, isMobile]);

  // Update last read when channel changes
  useEffect(() => {
    if (currentChannelId) {
      updateLastRead(currentChannelId);
    }
  }, [currentChannelId, updateLastRead]);

  const handleSendMessage = async (content: string, attachments: MessageAttachment[]) => {
    if (!currentChannelId) return;
    
    // Send message with attachments data
    await sendMessage(currentChannelId, content);
  };

  const handleStartVideoCall = (type: 'video' | 'audio') => {
    setCallType(type);
    setShowVideoCall(true);
  };

  const handleScheduleMessage = (content: string, scheduledFor: Date) => {
    logger.debug('Scheduled message:', content, 'for', scheduledFor);
  };

  const handleThreadMessage = (message: ThreadMessage) => {
    setThreadMessage(message);
    setShowThread(true);
  };

  const isChannelAdmin = currentChannel && profile && (
    currentChannel.created_by === profile.id || 
    profile.role === 'admin' || 
    profile.role === 'owner'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Announcements Banner */}
      <div className="p-4 border-b border-gray-200">
        <AnnouncementBanner />
      </div>

      <div className="relative flex h-[calc(100vh-8rem)] w-full bg-white overflow-hidden">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 z-20 lg:hidden"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {isMobile ? (
          <>
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-20 transform transition-transform duration-300 ease-in-out ${!showMobileSidebar ? '-translate-x-full' : 'translate-x-0'} w-80`}>
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
                canShowAvailability={(['supervisor','manager','admin','owner'] as const).includes((profile?.role as any))}
                available={available}
                onToggleAvailable={async (v) => { setAvailable(!!v); await supabase.auth.updateUser({ data: { availability: !!v } }); }}
              />
            </div>
            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <MessagesMainArea
                channel={currentChannel || null}
                messages={messages}
                messagesLoading={loading}
                isChannelAdmin={isChannelAdmin || false}
                onShowChannelMembers={() => setShowChannelMembers(true)}
                onShowChannelSettings={() => setShowChannelSettings(true)}
                onStartVideoCall={handleStartVideoCall}
                onScheduleMessage={handleScheduleMessage}
                onSendMessage={handleSendMessage}
                onThreadMessage={handleThreadMessage}
                onShowCreateDialog={() => setShowCreateDialog(true)}
                isMobile={isMobile}
                showMobileSidebar={showMobileSidebar}
                onToggleMobileSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
                filter={activeFilter}
                onChangeFilter={setActiveFilter}
                canShowAvailability={(['supervisor','manager','admin','owner'] as const).includes((profile?.role as any))}
                available={available}
                onToggleAvailable={async (v) => { setAvailable(!!v); await supabase.auth.updateUser({ data: { availability: !!v } }); }}
              />
            </div>
          </>
        ) : (
          // Desktop: resizable sidebar/main
          <div className="flex-1 h-full flex">
            {/* Left sidebar */}
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
                canShowAvailability={(['supervisor','manager','admin','owner'] as const).includes((profile?.role as any))}
                available={available}
                onToggleAvailable={async (v) => { setAvailable(!!v); await supabase.auth.updateUser({ data: { availability: !!v } }); }}
              />
            </div>
            {/* Draggable divider */}
            <div
              className="w-[6px] shrink-0 cursor-col-resize bg-border hover:bg-primary/40 z-10"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const start = sidebarWidth;
                const move = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const next = Math.min(Math.max(start + dx, 240), 340);
                  setSidebarWidth(next);
                };
                const up = () => {
                  window.removeEventListener('mousemove', move);
                  window.removeEventListener('mouseup', up);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
              }}
            />
            <div className="flex-1 min-w-0 flex flex-col">
              <MessagesMainArea
                channel={currentChannel || null}
                messages={messages}
                messagesLoading={loading}
                isChannelAdmin={isChannelAdmin || false}
                onShowChannelMembers={() => setShowChannelMembers(true)}
                onShowChannelSettings={() => setShowChannelSettings(true)}
                onStartVideoCall={handleStartVideoCall}
                onScheduleMessage={handleScheduleMessage}
                onSendMessage={handleSendMessage}
                onThreadMessage={handleThreadMessage}
                onShowCreateDialog={() => setShowCreateDialog(true)}
                isMobile={isMobile}
                showMobileSidebar={showMobileSidebar}
                onToggleMobileSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
                filter={activeFilter}
                onChangeFilter={setActiveFilter}
                canShowAvailability={(['supervisor','manager','admin','owner'] as const).includes((profile?.role as any))}
                available={available}
                onToggleAvailable={async (v) => { setAvailable(!!v); await supabase.auth.updateUser({ data: { availability: !!v } }); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <AnimatedChannelWizard 
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {showDirectMessageDialog && (
        <DirectMessageDialog
          open={showDirectMessageDialog}
          onClose={() => setShowDirectMessageDialog(false)}
        />
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
        <ChannelSettings
          open={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channel={currentChannel}
        />
      )}

      {showMessageSearch && (
        <MessageSearch
          open={showMessageSearch}
          onClose={() => setShowMessageSearch(false)}
        />
      )}

      {showCreateAnnouncement && (
        <CreateAnnouncement
          open={showCreateAnnouncement}
          onClose={() => setShowCreateAnnouncement(false)}
        />
      )}

      {/* Video Call Dialog */}
      {showVideoCall && currentChannel && (
        <VideoCallDialog
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          channelName={currentChannel.name}
          participants={[
            { id: '1', name: 'John Doe' },
            { id: '2', name: 'Jane Smith' },
            { id: '3', name: 'Mike Johnson' }
          ]}
          callType={callType}
        />
      )}

      {/* Threaded Message View */}
      {showThread && threadMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl h-[600px] bg-background rounded-lg shadow-xl">
            <ThreadedMessageView
              message={threadMessage}
              allReplies={[]} // You would pass actual replies here
              onClose={() => setShowThread(false)}
              onSendReply={(content, parentId) => {
                logger.debug('Send thread reply:', content, 'to', parentId);
                // Handle sending reply to thread
              }}
            />
          </div>
        </div>
      )}

      {/* Inline availability toggle is now in the sidebar header */}
    </div>
  );
}
