import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Hash, Users, Lock, MessageSquare, Search, Megaphone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { MessageChannel } from '@/types/messages';
import { Input } from '@/components/ui/input';
import { MessageFilterBar } from '@/components/MessageFilterBar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MessagesSidebarProps {
  channels: MessageChannel[];
  currentChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onShowCreateDialog: () => void;
  onShowDirectMessageDialog: () => void;
  onShowMessageSearch: () => void;
  onShowCreateAnnouncement: () => void;
  // Optional: search input wiring
  query?: string;
  onQueryChange?: (v: string) => void;
  // Filters
  activeFilter?: 'all' | 'unread' | 'teams' | 'helpdesk';
  onFilterChange?: (v: 'all' | 'unread' | 'teams' | 'helpdesk') => void;
  // Availability toggle (optional)
  canShowAvailability?: boolean;
  available?: boolean;
  onToggleAvailable?: (v: boolean) => Promise<void> | void;
}

export function MessagesSidebar({
  channels,
  currentChannelId,
  onChannelSelect,
  onShowCreateDialog,
  onShowDirectMessageDialog,
  onShowMessageSearch,
  onShowCreateAnnouncement,
  query,
  onQueryChange,
  activeFilter,
  onFilterChange,
  canShowAvailability,
  available,
  onToggleAvailable,
}: MessagesSidebarProps) {
  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) return <Lock className="h-4 w-4" />;
    if (type === 'direct') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Channels</h2>
          <div className="flex items-center gap-2">
            {canShowAvailability && typeof onToggleAvailable === 'function' && (
              <Button
                size="sm"
                variant={available ? 'default' : 'outline'}
                onClick={() => {
                  void onToggleAvailable(!available);
                }}
              >
                {available ? 'Available' : 'Set as Away'}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onShowDirectMessageDialog}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Direct Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowCreateDialog}>
                  <Hash className="mr-2 h-4 w-4" />
                  Create Channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowCreateAnnouncement}>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Create Announcement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {typeof onFilterChange === 'function' && activeFilter && (
          <MessageFilterBar active={activeFilter} onChange={onFilterChange} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {typeof onQueryChange === 'function' && typeof query === 'string' && (
            <div className="flex-1">
              <Label htmlFor="messages-sidebar-search" className="sr-only">
                Search channels
              </Label>
              <Input
                id="messages-sidebar-search"
                className="min-w-[160px] flex-1"
                placeholder="Search channels"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </div>
          )}
          <Button size="sm" variant="outline" onClick={onShowMessageSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-3">
          {channels.length === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-4 text-muted-foreground">No channels yet</p>
              <Button onClick={onShowCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Channel
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border border-transparent p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    currentChannelId === channel.id
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : 'hover:bg-primary/5'
                  )}
                  onClick={() => onChannelSelect(channel.id)}
                  aria-pressed={currentChannelId === channel.id}
                  aria-label={`Open ${channel.name} channel`}
                >
                  <div className="text-muted-foreground">
                    {getChannelIcon(channel.type, channel.is_private || false)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {channel.name}
                    </p>
                    {channel.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {channel.description}
                      </p>
                    )}
                  </div>
                  {channel.unread_count && channel.unread_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {channel.unread_count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
