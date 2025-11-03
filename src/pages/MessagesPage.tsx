import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageFilterBar } from '@/components/MessageFilterBar';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { NewConversationDialog, type ConversationDraft } from '@/components/messages/NewConversationDialog';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { loadUsers, saveUsers, ensureCurrentUser, type ChatUser } from '@/components/messages/users';
import { loadConversations, saveConversations, getConversationName, type Conversation, type ChatMessage } from '@/components/messages/conversations';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users as UsersIcon, MessageSquare, Paperclip, Image, Smile } from 'lucide-react';
import ErrorBoundary from '@/components/ui/error-boundary';

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

  const renderConversationMeta = (conversation: Conversation) => {
    const name = getConversationName(conversation, usersById, CURRENT_USER.id);
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const authorName = lastMessage ? usersById.get(lastMessage.authorId)?.name : undefined;
    const firstName = authorName?.split?.(' ')?.[0] ?? 'Unknown';

    const counterpartId =
      conversation.type === 'direct'
        ? conversation.participantIds.find((id) => id !== CURRENT_USER.id)
        : undefined;

    const avatarSrc =
      conversation.type === 'team'
        ? undefined
        : counterpartId
        ? usersById.get(counterpartId)?.avatar
        : undefined;

    const avatarFallback = name.slice(0, 2).toUpperCase() || 'CH';

    return (
      <div
        key={conversation.id}
        className={cn(
          'rounded-2xl border border-border/50 bg-background/95 shadow-sm transition duration-200 hover:border-primary/60 hover:shadow-md',
          activeConversation?.id === conversation.id && 'border-primary/70 bg-primary/5 shadow-md'
        )}
      >
        <button
          type="button"
          onClick={() => handleSelectConversation(conversation.id)}
          className="group flex w-full items-center gap-4 px-4 py-4 text-left"
        >
          <Avatar className="h-11 w-11">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : <AvatarFallback>{avatarFallback}</AvatarFallback>}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{name || 'Conversation'}</span>
              {lastMessage && (
                <span className="text-xs text-muted-foreground group-hover:text-foreground/80">
                  {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {lastMessage ? (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {firstName || '—'}: {lastMessage.content}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No messages yet</p>
            )}
          </div>
          {conversation.unreadCount > 0 && (
            <Badge variant="default" className="ml-auto text-[11px] px-2 py-0.5">
              {conversation.unreadCount}
            </Badge>
          )}
        </button>
      </div>
    );
  };

  const renderMessageBubble = (message: ChatMessage, previous?: ChatMessage) => {
    const author = usersById.get(message.authorId);
    const isMine = message.authorId === CURRENT_USER.id;
    const showAvatar = !isMine && previous?.authorId !== message.authorId;

    return (
      <div key={message.id} className={cn('flex gap-2 sm:gap-3', isMine ? 'justify-end' : 'justify-start')}>
        {!isMine && showAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={author?.avatar} alt={author?.name} />
            <AvatarFallback>{author?.name?.[0] ?? 'U'}</AvatarFallback>
          </Avatar>
        )}
        <div className={cn('max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm', isMine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          {!isMine && (
            <div className="text-xs font-medium mb-1 text-foreground/80">{author?.name ?? 'Someone'}</div>
          )}
          <div className="whitespace-pre-line leading-relaxed">{message.content}</div>
          <div className="text-[11px] opacity-70 mt-1 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.edited && ' · edited'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full flex-1 max-w-7xl">
        <ResizablePanelGroup direction="horizontal" className="flex w-full flex-1 items-stretch">
          <ResizablePanel defaultSize={32} minSize={22} maxSize={44} className="flex min-w-[280px]">
            <div className="flex h-full w-full flex-col pr-3 lg:pr-4">
              <Card className="flex flex-1 flex-col">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Conversations</CardTitle>
                      <p className="text-xs text-muted-foreground">Talk with teammates and groups</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowNewConversation(true)}
                      disabled={!hasTeammates}
                      title={hasTeammates ? undefined : 'Invite teammates to start a new chat'}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <MessageFilterBar
                      active={filter}
                      onChange={handleFilterChange}
                      labels={{ all: 'All', unread: 'Unread', teams: 'Teams', helpdesk: 'Help Desk' }}
                    />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search"
                      className="h-9 w-full sm:max-w-[240px]"
                    />
                  </div>

                  {!hasTeammates && (
                    <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-xs text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">You&apos;re the first one here.</p>
                      <p className="mt-1">
                        Invite teammates to the workspace and your conversations will appear once they join.
                      </p>
                    </div>
                  )}

                  <ScrollArea className="flex-1 min-h-0 pr-1">
                    <div className="space-y-3">
                      {filteredConversations.map((conversation) => renderConversationMeta(conversation))}

                      {filteredConversations.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          <UsersIcon className="mx-auto mb-3 h-8 w-8" />
                          <p>
                            {hasTeammates
                              ? conversations.length === 0
                                ? 'No conversations yet'
                                : 'No conversations match the current filters'
                              : 'Invite teammates to start your first conversation'}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-1 w-2 rounded-full bg-border/60 hover:bg-border focus-visible:ring-2 focus-visible:ring-primary/40" />

          <ResizablePanel defaultSize={68} minSize={40} className="flex min-w-[280px]">
            <div className="flex h-full w-full flex-col pl-3 lg:pl-4">
              <Card className="flex flex-1 flex-col">
                <CardHeader className="flex flex-col gap-2 border-b">
                  {activeConversation ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>{getConversationName(activeConversation, usersById, CURRENT_USER.id) || 'Conversation'}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          <UsersIcon className="h-3.5 w-3.5" />
                          <span>
                            {activeConversation.participantIds
                              .filter((id) => id !== CURRENT_USER.id)
                              .map((id) => usersById.get(id)?.name ?? 'Unknown')
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                      <AvailabilityToggle />
                    </div>
                  ) : (
                    <div>
                      <CardTitle>No conversation selected</CardTitle>
                      <p className="text-sm text-muted-foreground">Choose a conversation or start a new one.</p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex flex-1 flex-col min-h-0">
                  {activeConversation ? (
                    <>
                      <ScrollArea className="flex-1 min-h-0 pr-3">
                        <div className="space-y-4 py-4">
                          {activeConversation.messages.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-12">
                              Be the first to say something in this chat.
                            </div>
                          ) : (
                            <ErrorBoundary
                              fallback={
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                                  Message unavailable. Some content could not be displayed.
                                </div>
                              }
                            >
                              <>
                                {activeConversation.messages.map((message, index) =>
                                  renderMessageBubble(message, activeConversation.messages[index - 1])
                                )}
                              </>
                            </ErrorBoundary>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="border-t pt-4">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                          <Textarea
                            placeholder="Write a message..."
                            value={draftMessage}
                            onChange={(event) => setDraftMessage(event.target.value)}
                            className="min-h-[96px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                          />
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Attach file">
                                <Paperclip className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Add image">
                                <Image className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Add emoji">
                                <Smile className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button onClick={handleSendMessage} disabled={!draftMessage.trim()}>
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                      <div className="space-y-2">
                        <MessageSquare className="mx-auto h-10 w-10" />
                        <p>
                          {hasTeammates
                            ? 'Select a conversation to view the chat history.'
                            : 'Invite teammates to start your first conversation.'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
