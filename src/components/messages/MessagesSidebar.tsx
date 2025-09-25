import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Hash, Users, Lock, MessageSquare, Search, Megaphone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { MessageChannel } from '@/types/messages';
import { Input } from '@/components/ui/input';
import { MessageFilterBar } from '@/components/MessageFilterBar';

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
  onToggleAvailable
}: MessagesSidebarProps) {
  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) return <Lock className="h-4 w-4" />;
    if (type === 'direct') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Messages</h2>
          {/* Filters inline with title */}
          {typeof onFilterChange === 'function' && activeFilter && (
            <MessageFilterBar active={activeFilter} onChange={onFilterChange} />
          )}
        </div>
        {/* Actions: search + create */}
        <div className="flex items-center justify-between gap-2">
          {typeof onQueryChange === 'function' && typeof query === 'string' && (
            <Input className="w-48" placeholder="Search..." value={query} onChange={(e) => onQueryChange(e.target.value)} />
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={onShowMessageSearch}>
              <Search className="h-4 w-4" />
            </Button>
            {canShowAvailability && typeof onToggleAvailable === 'function' && (
              <Button size="sm" variant="ghost" onClick={() => onToggleAvailable(!available)}>
                {available ? 'Available' : 'Away'}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onShowDirectMessageDialog}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Direct Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowCreateDialog}>
                  <Hash className="h-4 w-4 mr-2" />
                  Create Channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowCreateAnnouncement}>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Create Announcement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {channels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No channels yet</p>
              <Button onClick={onShowCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    currentChannelId === channel.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <div className="text-gray-500">
                    {getChannelIcon(channel.type, channel.is_private || false)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {channel.name}
                    </p>
                    {channel.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {channel.description}
                      </p>
                    )}
                  </div>
                  {channel.unread_count && channel.unread_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {channel.unread_count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
