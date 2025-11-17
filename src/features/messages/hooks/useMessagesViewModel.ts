import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useMessages } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import type { Message, MessageAttachment, MessageChannel, ThreadMessage } from '@/types/messages';
import { logger } from '@/utils/logger';
import { useAvailabilityStatus } from './useAvailabilityStatus';
import { useChannelActions } from './useChannelActions';
import { useMessageActions } from './useMessageActions';

type FilterType = 'all' | 'unread' | 'teams' | 'helpdesk';
type CallType = 'video' | 'audio';
type ProfileDetails = ReturnType<typeof useProfile>['profile'];

interface MessagesViewModelState {
  isMobile: boolean;
  loading: boolean;
  channels: MessageChannel[];
  messages: Message[];
  filteredChannels: MessageChannel[];
  currentChannel: MessageChannel | null;
  currentChannelId: string | null;
  setCurrentChannelId: Dispatch<SetStateAction<string | null>>;
  showMobileSidebar: boolean;
  setShowMobileSidebar: Dispatch<SetStateAction<boolean>>;
  showCreateDialog: boolean;
  setShowCreateDialog: Dispatch<SetStateAction<boolean>>;
  showDirectMessageDialog: boolean;
  setShowDirectMessageDialog: Dispatch<SetStateAction<boolean>>;
  showChannelMembers: boolean;
  setShowChannelMembers: Dispatch<SetStateAction<boolean>>;
  showChannelSettings: boolean;
  setShowChannelSettings: Dispatch<SetStateAction<boolean>>;
  showMessageSearch: boolean;
  setShowMessageSearch: Dispatch<SetStateAction<boolean>>;
  showCreateAnnouncement: boolean;
  setShowCreateAnnouncement: Dispatch<SetStateAction<boolean>>;
  isVideoCallOpen: boolean;
  callType: CallType | null;
  handleStartVideoCall: (type: CallType) => void;
  handleCloseVideoCall: () => void;
  handleScheduleMessage: (content: string, scheduledFor: Date) => void;
  handleSendMessage: (content: string, attachments: MessageAttachment[]) => Promise<void>;
  threadMessage: ThreadMessage | null;
  isThreadOpen: boolean;
  closeThread: () => void;
  handleThreadMessage: (message: ThreadMessage) => void;
  handleDeleteChannel: (channelId: string) => Promise<void>;
  handleChannelUpdated: () => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  sidebarWidth: number;
  setSidebarWidth: Dispatch<SetStateAction<number>>;
  activeFilter: FilterType;
  setActiveFilter: (value: FilterType) => void;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  available: boolean;
  handleAvailabilityChange: (value: boolean) => Promise<void>;
  canToggleAvailability: boolean;
  profile: ProfileDetails;
}

export function useMessagesViewModel(): MessagesViewModelState {
  const {
    channels,
    messages,
    loading,
    currentChannelId,
    setCurrentChannelId,
    refetchChannels,
    refetchMessages,
    error: messagesError,
    clearError: clearMessagesError,
  } = useMessages();
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ filter?: string }>();
  const { deleteChannel: deleteChannelAction, updateLastRead: updateLastReadAction } = useChannelActions();
  const { sendMessage: sendMessageAction, deleteMessage: deleteMessageAction } = useMessageActions();

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [query, setQuery] = useState('');
  const { available, updateAvailability } = useAvailabilityStatus();

  const currentChannel = useMemo(
    () => channels.find((channel) => channel.id === currentChannelId) ?? null,
    [channels, currentChannelId],
  );

  const normalizeFilter = useCallback((value?: string | null): FilterType | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    switch (normalized) {
      case 'all':
      case 'unread':
      case 'teams':
      case 'helpdesk':
        return normalized as FilterType;
      default:
        return null;
    }
  }, []);

  const routeFilter = useMemo(
    () => normalizeFilter(params.filter),
    [params.filter, normalizeFilter],
  );

  const queryFilter = useMemo(
    () => normalizeFilter(new URLSearchParams(location.search).get('filter')),
    [location.search, normalizeFilter],
  );

  const activeFilter = routeFilter ?? queryFilter ?? 'all';

  useEffect(() => {
    const basePath = '/app/messages';
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';

    if (params.filter && !routeFilter) {
      if (currentPath !== basePath) {
        navigate(basePath, { replace: true });
      }
      return;
    }

    if (!params.filter && queryFilter && queryFilter !== 'all') {
      const target = `${basePath}/${queryFilter}`;
      if (currentPath !== target) {
        navigate(target, { replace: true });
      }
    }
  }, [location.pathname, navigate, params.filter, routeFilter, queryFilter]);

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
      updateLastReadAction(currentChannelId);
    }
  }, [currentChannelId, updateLastReadAction]);

  useEffect(() => {
    if (!messagesError) return;

    logger.error?.('Messages module error', messagesError);
    toast({
      title: 'Something went wrong',
      description: messagesError.message ?? 'Please try again shortly.',
      variant: 'destructive',
    });
    clearMessagesError();
  }, [clearMessagesError, messagesError, toast]);

  const canToggleAvailability = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase();
    return ['supervisor', 'manager', 'admin', 'owner', 'company_admin'].includes(role);
  }, [profile?.role]);

  const filteredChannels = useMemo<MessageChannel[]>(() => {
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

  const handleAvailabilityChange = useCallback(
    async (value: boolean): Promise<void> => {
      await updateAvailability(value);
    },
    [updateAvailability],
  );

  const handleSendMessage = useCallback(
    async (content: string, attachments: MessageAttachment[]): Promise<void> => {
      if (!currentChannelId) return;
      await sendMessageAction(currentChannelId, content, {
        attachments,
      });
    },
    [currentChannelId, sendMessageAction],
  );

  const handleStartVideoCall = useCallback((type: CallType): void => {
    setCallType(type);
  }, []);

  const handleCloseVideoCall = useCallback((): void => {
    setCallType(null);
  }, []);

  const handleScheduleMessage = useCallback((content: string, scheduledFor: Date): void => {
    logger.debug('Scheduled message:', content, 'for', scheduledFor);
  }, []);

  const handleThreadMessage = useCallback((message: ThreadMessage): void => {
    setThreadMessage(message);
  }, []);

  const closeThread = useCallback((): void => {
    setThreadMessage(null);
  }, []);

  const handleDeleteChannel = useCallback(
    async (channelId: string): Promise<void> => {
      try {
        await deleteChannelAction(channelId);
        if (currentChannelId === channelId) {
          setCurrentChannelId(null);
        }
        await refetchChannels();
      } catch {
        // toast handled inside action
      }
    },
    [currentChannelId, deleteChannelAction, refetchChannels, setCurrentChannelId],
  );

  const handleChannelUpdated = useCallback(async () => {
    await refetchChannels();
  }, [refetchChannels]);

  const handleDeleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        await deleteMessageAction(messageId);
        await refetchMessages();
      } catch {
        // toast handled inside action
      }
    },
    [deleteMessageAction, refetchMessages],
  );

  const navigateToFilter = useCallback(
    (value: FilterType): void => {
      const basePath = '/app/messages';
      const target = value === 'all' ? basePath : `${basePath}/${value}`;
      if (location.pathname !== target) {
        navigate(target, { replace: true });
      }
    },
    [location.pathname, navigate],
  );

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
    isVideoCallOpen: callType !== null,
    callType,
    handleStartVideoCall,
    handleCloseVideoCall,
    handleScheduleMessage,
    handleSendMessage,
    threadMessage,
    isThreadOpen: Boolean(threadMessage),
    closeThread,
    handleThreadMessage,
    sidebarWidth,
    setSidebarWidth,
    activeFilter,
    setActiveFilter: navigateToFilter,
    query,
    setQuery,
    available,
    handleAvailabilityChange,
    canToggleAvailability,
    profile,
    handleDeleteChannel,
    handleChannelUpdated,
    handleDeleteMessage,
  };
}

export type MessagesViewModel = MessagesViewModelState;
