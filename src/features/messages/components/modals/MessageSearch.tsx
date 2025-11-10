import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, X, MessageSquare, Hash, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SearchResult {
  type: 'message' | 'channel';
  id: string;
  content?: string;
  name?: string;
  description?: string;
  created_at: string;
  sender_profile?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  channel?: {
    id: string;
    name: string;
    type: string;
    is_private: boolean;
  };
}

interface MessageSearchProps {
  open: boolean;
  onClose: () => void;
  onResultSelect?: (result: SearchResult) => void;
}

export function MessageSearch({ open, onClose, onResultSelect }: MessageSearchProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const escapeRegExp = useCallback((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), []);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Search messages
      const { data: messageResults, error: messageError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_profile:profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          channel:message_channels!messages_channel_id_fkey(
            id,
            name,
            type,
            is_private
          )
        `)
        .textSearch('content', query)
        .order('created_at', { ascending: false })
        .limit(10);

      // Search channels
      const { data: channelResults, error: channelError } = await supabase
        .from('message_channels')
        .select(`
          id,
          name,
          description,
          type,
          is_private,
          created_at
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messageError) throw messageError;
      if (channelError) throw channelError;

      const formattedResults: SearchResult[] = [
        ...(messageResults || []).map(msg => ({
          type: 'message' as const,
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender_profile: msg.sender_profile,
          channel: msg.channel
        })),
        ...(channelResults || []).map(channel => ({
          type: 'channel' as const,
          id: channel.id,
          name: channel.name,
          description: channel.description,
          created_at: channel.created_at
        }))
      ];

      setResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) return <Lock className="h-4 w-4" />;
    if (type === 'direct') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  const highlightQuery = useCallback(
    (text: string, query: string) => {
      if (!query) return text;
      const safeQuery = escapeRegExp(query);
      const regex = new RegExp(`(${safeQuery})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={`${part}-${index}`} className="rounded px-1 bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    },
    [escapeRegExp],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages and channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-xl"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          <ScrollArea className="h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : results.length === 0 && searchQuery.length >= 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      onResultSelect?.(result);
                      onClose();
                    }}
                  >
                    {result.type === 'message' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <Badge variant="outline" className="text-xs">
                            Message
                          </Badge>
                          {result.channel && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getChannelIcon(result.channel.type, result.channel.is_private)}
                              <span>#{result.channel.name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-start gap-3">
                          {(() => {
                            const firstName = result.sender_profile?.first_name?.trim() ?? '';
                            const lastName = result.sender_profile?.last_name?.trim() ?? '';
                            const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Hidden user';
                            const firstInitial = firstName.charAt(0) || lastName.charAt(0) || 'U';
                            const secondInitial = lastName.charAt(0) || firstName.charAt(1) || '';
                            const initials = `${firstInitial}${secondInitial}`.toUpperCase().slice(0, 2) || 'U';
                            const createdAt = new Date(result.created_at);
                            const createdAtLabel = Number.isNaN(createdAt.getTime())
                              ? ''
                              : format(createdAt, 'MMM dd, yyyy');

                            return (
                              <>
                                <Avatar className="h-8 w-8">
                                  {result.sender_profile?.avatar_url ? (
                                    <AvatarImage
                                      src={result.sender_profile.avatar_url ?? undefined}
                                      alt={displayName}
                                    />
                                  ) : null}
                                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-sm font-medium">{displayName}</span>
                                    {createdAtLabel && (
                                      <span className="text-xs text-muted-foreground">{createdAtLabel}</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {result.content ? highlightQuery(result.content, searchQuery) : null}
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-secondary" />
                          <Badge variant="outline" className="text-xs">
                            Channel
                          </Badge>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm">
                            {result.name && highlightQuery(result.name, searchQuery)}
                          </h4>
                          {result.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {highlightQuery(result.description, searchQuery)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {searchQuery.length >= 2 && (
            <div className="mt-4 text-xs text-muted-foreground text-center">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
