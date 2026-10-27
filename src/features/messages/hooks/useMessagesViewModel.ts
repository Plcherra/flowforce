import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "@/lib/router-adapter";

import { useMessages } from "@/hooks/useMessages";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import type {
  Message,
  MessageAttachment,
  MessageChannel,
  ThreadMessage,
} from "@/types/messages";
import { threadReplyDraft } from "@/features/messages/threadReplies";
import { logger } from "@/utils/logger";
import { useAvailabilityStatus } from "./useAvailabilityStatus";
import { useChannelActions } from "./useChannelActions";
import { useMessageActions } from "./useMessageActions";

type FilterType = "all" | "unread" | "teams";
type ProfileDetails = ReturnType<typeof useProfile>["profile"];

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
  handleSendMessage: (
    content: string,
    attachments: MessageAttachment[],
  ) => Promise<void>;
  handleSendThreadReply: (content: string, parentId?: string) => Promise<void>;
  threadMessage: ThreadMessage | null;
  isThreadOpen: boolean;
  closeThread: () => void;
  handleThreadMessage: (message: ThreadMessage) => void;
  handleDeleteChannel: (channelId: string) => Promise<void>;
  handleChannelUpdated: () => Promise<void>;
  handleUpdateMessage: (messageId: string, content: string) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  startDirectChat: (user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }) => Promise<void>;
  startGroupChat: (input: {
    name: string;
    memberIds: string[];
  }) => Promise<void>;
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
    createChannel,
    refetchChannels,
    refetchMessages,
    appendMessage,
    error: messagesError,
    clearError: clearMessagesError,
  } = useMessages();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ filter?: string }>();
  const {
    deleteChannel: deleteChannelAction,
    updateLastRead: updateLastReadAction,
  } = useChannelActions();
  const {
    sendMessage: sendMessageAction,
    deleteMessage: deleteMessageAction,
    updateMessage: updateMessageAction,
  } = useMessageActions();

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(
    null,
  );
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [query, setQuery] = useState("");
  const { available, updateAvailability } = useAvailabilityStatus();

  const currentChannel = useMemo(() => {
    if (!Array.isArray(channels) || channels.length === 0) return null;
    return channels.find((channel) => channel.id === currentChannelId) ?? null;
  }, [channels, currentChannelId]);

  const normalizeFilter = useCallback(
    (value?: string | null): FilterType | null => {
      if (!value) return null;
      const normalized = value.toLowerCase();
      switch (normalized) {
        case "all":
        case "unread":
        case "teams":
          return normalized as FilterType;
        default:
          return null;
      }
    },
    [],
  );

  const routeFilter = useMemo(
    () => normalizeFilter(params.filter),
    [params.filter, normalizeFilter],
  );

  const queryFilter = useMemo(
    () => normalizeFilter(new URLSearchParams(location.search).get("filter")),
    [location.search, normalizeFilter],
  );

  const activeFilter = routeFilter ?? queryFilter ?? "all";

  useEffect(() => {
    const basePath = "/app/messages";
    const currentPath = location.pathname.replace(/\/+$/, "") || "/";

    if (params.filter && !routeFilter) {
      if (currentPath !== basePath) {
        navigate(basePath, { replace: true });
      }
      return;
    }

    if (!params.filter && queryFilter && queryFilter !== "all") {
      const target = `${basePath}/${queryFilter}`;
      if (currentPath !== target) {
        navigate(target, { replace: true });
      }
    }
  }, [location.pathname, navigate, params.filter, routeFilter, queryFilter]);

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

  const lastMessagesErrorRef = useRef<Error | null>(null);
  useEffect(() => {
    if (!messagesError) {
      lastMessagesErrorRef.current = null;
      return;
    }
    // Avoid duplicate toasts for the same error (e.g. React Strict Mode double-invoke)
    if (lastMessagesErrorRef.current === messagesError) return;
    lastMessagesErrorRef.current = messagesError;

    logger.error("Messages module error", { error: messagesError });
    toast({
      title: t("common.somethingWentWrong"),
      description: messagesError.message ?? t("messages.pleaseTryAgainShortly"),
      variant: "destructive",
    });
    clearMessagesError();
  }, [clearMessagesError, messagesError, t, toast]);

  const canToggleAvailability = useMemo(() => {
    const role = (profile?.role ?? "").toLowerCase();
    return [
      "supervisor",
      "manager",
      "admin",
      "owner",
      "company_admin",
    ].includes(role);
  }, [profile?.role]);

  const filteredChannels = useMemo<MessageChannel[]>(() => {
    const uid = profile?.id;
    let list = channels.slice();

    if (activeFilter === "unread") {
      list = list.filter((channel) => {
        const me = channel.channel_members?.find(
          (member) => member.user_id === uid,
        );
        if (!me?.last_read_at) return true;
        return new Date(channel.updated_at) > new Date(me.last_read_at);
      });
    }

    if (activeFilter === "teams") {
      list = list.filter((channel) => channel.type !== "direct");
    }

    if (query.trim()) {
      const keyword = query.toLowerCase();
      list = list.filter((channel) =>
        `${channel.name ?? ""} ${channel.description ?? ""}`
          .toLowerCase()
          .includes(keyword),
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
    async (
      content: string,
      attachments: MessageAttachment[],
    ): Promise<void> => {
      if (!currentChannelId) return;
      const sent = await sendMessageAction(currentChannelId, content, {
        attachments,
      });
      appendMessage(sent);
    },
    [appendMessage, currentChannelId, sendMessageAction],
  );

  const handleSendThreadReply = useCallback(
    async (content: string, parentId?: string): Promise<void> => {
      if (!currentChannelId || !threadMessage) return;
      const draft = threadReplyDraft(content, threadMessage.id, parentId);
      if (!draft) return;
      const sent = await sendMessageAction(currentChannelId, draft.content, {
        replyToId: draft.replyToId,
      });
      appendMessage(sent);
    },
    [appendMessage, currentChannelId, sendMessageAction, threadMessage],
  );

  const handleThreadMessage = useCallback((message: ThreadMessage): void => {
    setThreadMessage(message);
  }, []);

  useEffect(() => {
    setThreadMessage(null);
  }, [currentChannelId]);

  useEffect(() => {
    if (!threadMessage) return;
    const stillVisible = messages.some((message) => message.id === threadMessage.id);
    if (!stillVisible) setThreadMessage(null);
  }, [messages, threadMessage]);

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
    [
      currentChannelId,
      deleteChannelAction,
      refetchChannels,
      setCurrentChannelId,
    ],
  );

  const handleChannelUpdated = useCallback(async () => {
    await refetchChannels();
  }, [refetchChannels]);

  const handleUpdateMessage = useCallback(
    async (messageId: string, content: string): Promise<void> => {
      try {
        await updateMessageAction(messageId, content);
        await refetchMessages();
      } catch {
        // toast handled inside action
      }
    },
    [updateMessageAction, refetchMessages],
  );

  const startDirectChat = useCallback(
    async (user: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }) => {
      const existing = channels.find(
        (channel) =>
          (channel.type ?? "").toLowerCase() === "direct" &&
          channel.channel_members?.some((member) => member.user_id === user.id),
      );
      if (existing) {
        setCurrentChannelId(existing.id);
        setShowDirectMessageDialog(false);
        setShowMobileSidebar(false);
        return;
      }

      const channelName =
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
        user.email ||
        t("messages.directMessage2");
      const { data, error } = await createChannel({
        name: channelName,
        description: t("messages.directMessageWith", { name: channelName }),
        type: "direct",
        is_private: true,
        memberids: [user.id],
      });
      if (error) {
        toast({
          title: t("messages.couldNotStartChat"),
          description: error.message || t("messages.tryAgainMoment"),
          variant: "destructive",
        });
        return;
      }
      if (data?.id) {
        setCurrentChannelId(data.id);
      }
      setShowDirectMessageDialog(false);
      setShowMobileSidebar(false);
    },
    [channels, createChannel, setCurrentChannelId, t, toast],
  );

  const startGroupChat = useCallback(
    async (input: { name: string; memberIds: string[] }) => {
      const name = input.name.trim();
      if (!name || input.memberIds.length === 0) return;
      const { data, error } = await createChannel({
        name,
        type: "group",
        is_private: true,
        memberids: input.memberIds,
      });
      if (error) {
        toast({
          title: t("messages.couldNotStartGroup"),
          description: error.message || t("messages.tryAgainMoment"),
          variant: "destructive",
        });
        return;
      }
      if (data?.id) {
        setCurrentChannelId(data.id);
      }
      setShowDirectMessageDialog(false);
      setShowMobileSidebar(false);
    },
    [createChannel, setCurrentChannelId, t, toast],
  );

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
      const basePath = "/app/messages";
      const target = value === "all" ? basePath : `${basePath}/${value}`;
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
    handleSendMessage,
    handleSendThreadReply,
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
    handleUpdateMessage,
    handleDeleteMessage,
    startDirectChat,
    startGroupChat,
  };
}

export type MessagesViewModel = MessagesViewModelState;
