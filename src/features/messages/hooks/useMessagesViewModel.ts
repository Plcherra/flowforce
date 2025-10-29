import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMessages } from '@/hooks/messages/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { MessageAttachment, ThreadMessage } from '@/types/messages';
import { logger } from '@/utils/logger';

type FilterType = 'all' | 'unread' | 'teams' | 'helpdesk';
type CallType = 'video' | 'audio';

export function useMessagesViewModel() {
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
  const [callType, setCallType] = useState<CallType>('video');
  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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

  const handleStartVideoCall = useCallback((type: CallType) => {
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

  return {
    isMobile,
    loading,
    channels,
    messages,
    filteredChannels,
    currentChannel,
    currentChannelId,
    setCurrentChannelId,
    showMobileSidebar,
    setShowMobileSidebar,
    showCreateDialog,
    setShowCreateDialog,
    showDirectMessageDialog,
    setShowDirectMessageDialog,
    showChannelMembers,
    setShowChannelMembers,
    showChannelSettings,
    setShowChannelSettings,
    showMessageSearch,
    setShowMessageSearch,
    showCreateAnnouncement,
    setShowCreateAnnouncement,
    showVideoCall,
    setShowVideoCall,
    callType,
    handleStartVideoCall,
    handleScheduleMessage,
    handleSendMessage,
    threadMessage,
    showThread,
    setShowThread,
    setThreadMessage,
    handleThreadMessage,
    sidebarWidth,
    setSidebarWidth,
    activeFilter,
    setActiveFilter,
    query,
    setQuery,
    available,
    handleAvailabilityChange,
    canToggleAvailability,
    profile,
  };
}

export type MessagesViewModel = ReturnType<typeof useMessagesViewModel>;
