import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { NewConversationDialog, type ConversationDraft } from '@/components/messages/NewConversationDialog';
import { loadUsers, saveUsers, ensureCurrentUser, type ChatUser } from '@/components/messages/users';
import { loadConversations, saveConversations, getConversationName, type Conversation, type ChatMessage } from '@/components/messages/conversations';
import { ConversationsPanel } from '@/components/messages/ConversationsPanel';
import { ChatPanel } from '@/components/messages/ChatPanel';
import { MessagesLayout } from '@/components/messages/MessagesLayout';
import { supabase } from '@/integrations/supabase/client';

type FilterKey = 'all' | 'unread' | 'teams' | 'helpdesk';

const CURRENT_USER: ChatUser = {
  id: 'current-user',
  name: 'You',
  role: 'Team member',
  status: 'online',
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export default function MessagesPage() {
  const [users, setUsers] = useState<ChatUser[]>(() => {
    if (typeof window === 'undefined') return [CURRENT_USER];
    ensureCurrentUser(CURRENT_USER);
    const stored = loadUsers();
    return stored.length > 0 ? stored : [CURRENT_USER];
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  const navigate = useNavigate();
  const location = useLocation();
  const { filter: filterParam } = useParams<{ filter?: string }>();

  const normalizeFilter = (value?: string | null): FilterKey | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    switch (normalized) {
      case 'all':
      case 'unread':
      case 'teams':
      case 'helpdesk':
        return normalized as FilterKey;
      default:
        return null;
    }
  };

  const routeFilter = normalizeFilter(filterParam);
  const queryFilter = normalizeFilter(new URLSearchParams(location.search).get('filter'));
  const filter: FilterKey = routeFilter ?? queryFilter ?? 'all';

  useEffect(() => {
    if (filterParam && !routeFilter) {
      navigate('/app/messages', { replace: true });
    }
  }, [filterParam, routeFilter, navigate]);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    if (!filterParam && queryFilter && queryFilter !== 'all' && normalizedPath === '/app/messages') {
      navigate(`/app/messages/${queryFilter}`, { replace: true });
    }
  }, [filterParam, queryFilter, location.pathname, navigate]);

  const handleFilterChange = (next: FilterKey) => {
    if (next === filter) return;
    if (next === 'all') {
      navigate('/app/messages');
    } else {
      navigate(`/app/messages/${next}`);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      ensureCurrentUser(CURRENT_USER);
      const storedUsers = loadUsers();
      const storedConversations = loadConversations();

      if (!cancelled) {
        setUsers(storedUsers.length > 0 ? storedUsers : [CURRENT_USER]);
        setConversations(storedConversations);
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, avatar_url');

        if (error) throw error;

        if (!cancelled && data) {
          const roster: ChatUser[] = data
            .filter((profile) => profile.id && profile.id !== CURRENT_USER.id)
            .map((profile) => ({
              id: profile.id,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Teammate',
              role: profile.role || 'Member',
              avatar: profile.avatar_url || undefined,
              status: 'offline',
            }));

          const combined = [CURRENT_USER, ...roster];
          setUsers(combined);
          saveUsers(combined);
        }
      } catch (err) {
        console.warn('Failed to load teammates', err);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const usersById = useMemo(() => {
    const map = new Map<string, ChatUser>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.unreadCount === 0) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id ? { ...conversation, unreadCount: 0 } : conversation
      )
    );
  }, [activeConversation?.id]);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conversation) => {
        if (filter === 'unread' && conversation.unreadCount === 0) return false;
        if (filter === 'teams' && conversation.type !== 'team') return false;
        if (filter === 'helpdesk' && !conversation.topic?.toLowerCase().includes('help')) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        const name = getConversationName(conversation, usersById, CURRENT_USER.id).toLowerCase();
        const participantNames = conversation.participantIds
          .map((id) => usersById.get(id)?.name ?? '')
          .join(' ')
          .toLowerCase();
        return name.includes(q) || participantNames.includes(q);
      })
      .sort((a, b) => {
        const aTime = a.messages[a.messages.length - 1]?.timestamp ?? '';
        const bTime = b.messages[b.messages.length - 1]?.timestamp ?? '';
        return +new Date(bTime) - +new Date(aTime);
      });
  }, [conversations, filter, query, usersById]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = () => {
    if (!activeConversation || !draftMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: generateId(),
      authorId: CURRENT_USER.id,
      content: draftMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [...conversation.messages, newMessage] }
          : conversation
      )
    );

    setDraftMessage('');
  };

  const handleCreateConversation = (draft: ConversationDraft) => {
    const newConversationId = generateId();
    const participantIds = Array.from(new Set([CURRENT_USER.id, ...draft.participantIds]));

    const directTargetId = draft.type === 'direct' ? draft.participantIds[0] : undefined;
    const name =
      draft.type === 'team'
        ? draft.name
        : directTargetId
          ? usersById.get(directTargetId)?.name ?? 'Direct message'
          : 'Direct message';

    const newConversation: Conversation = {
      id: newConversationId,
      type: draft.type,
      name,
      participantIds,
      unreadCount: 0,
      topic: draft.type === 'team' ? draft.name : undefined,
      messages: [
        {
          id: generateId(),
          authorId: CURRENT_USER.id,
          content: draft.initialMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversationId);
  };

  const teammateOptions = useMemo(
    () =>
      users
        .filter((user) => user.id !== CURRENT_USER.id)
        .map((user) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
        })),
    [users]
  );
  const hasTeammates = teammateOptions.length > 0;


  return (
    <div className="messages-page flex h-full min-h-0 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full flex-1 max-w-7xl">
        <MessagesLayout
          className="flex-1"
          sidebarWidth={sidebarWidth}
          onSidebarWidthChange={setSidebarWidth}
          minSidebarWidth={250}
          minContentWidth={360}
          dividerAriaLabel="Resize conversations list"
          sidebarId="messages-page-sidebar"
          contentId="messages-page-content"
          sidebar={
            <ConversationsPanel
              filter={filter}
              onFilterChange={handleFilterChange}
              query={query}
              onQueryChange={setQuery}
              conversations={filteredConversations}
              totalConversations={conversations.length}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              hasTeammates={hasTeammates}
              onNewConversation={() => setShowNewConversation(true)}
              usersById={usersById}
              currentUserId={CURRENT_USER.id}
              className="h-full"
            />
          }
          content={
            <ChatPanel
              conversation={activeConversation}
              usersById={usersById}
              currentUserId={CURRENT_USER.id}
              draftMessage={draftMessage}
              onDraftMessageChange={setDraftMessage}
              onSendMessage={handleSendMessage}
              hasTeammates={hasTeammates}
            />
          }
        />
      </div>

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        users={teammateOptions}
        currentUserId={CURRENT_USER.id}
        onCreate={handleCreateConversation}
      />
    </div>
  );
}
