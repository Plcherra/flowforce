import React from 'react';
import { Button } from '@/components/ui/button';
import { Hash, Users, Lock, MoreVertical, Settings, Phone, Video, Clock, Menu, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageScheduler } from './MessageScheduler';
import type { MessageChannel } from '@/types/messages';

interface MessagesHeaderProps {
  channel: MessageChannel;
  isChannelAdmin: boolean;
  onShowChannelMembers: () => void;
  onShowChannelSettings: () => void;
  onStartVideoCall: (type: 'video' | 'audio') => void;
  onScheduleMessage: (content: string, scheduledFor: Date) => void;
  isMobile?: boolean;
  showMobileSidebar?: boolean;
  onToggleMobileSidebar?: () => void;
  canShowAvailability?: boolean;
  available?: boolean;
  onToggleAvailable?: (v: boolean) => void;
}

export function MessagesHeader({
  channel,
  isChannelAdmin,
  onShowChannelMembers,
  onShowChannelSettings,
  onStartVideoCall,
  onScheduleMessage,
  isMobile = false,
  showMobileSidebar = false,
  onToggleMobileSidebar,
  canShowAvailability,
  available,
  onToggleAvailable
}: MessagesHeaderProps) {
  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) return <Lock className="h-4 w-4" />;
    if (type === 'direct') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isMobile && onToggleMobileSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMobileSidebar}
              className="mr-2 lg:hidden"
            >
              {showMobileSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          )}
          
          <div className="text-gray-500">
            {getChannelIcon(channel.type, channel.is_private || false)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
              {channel.name}
            </h3>
            {channel.description && !isMobile && (
              <p className="text-sm text-gray-500 truncate">{channel.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!isMobile && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onStartVideoCall('audio')}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onStartVideoCall('video')}
              >
                <Video className="h-4 w-4" />
              </Button>
              
              <MessageScheduler
                channelId={channel.id}
                channelName={channel.name}
                onScheduleMessage={onScheduleMessage}
              >
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4" />
                </Button>
              </MessageScheduler>
            </>
          )}

          <Button 
            size="sm" 
            variant="ghost"
            onClick={onShowChannelMembers}
            className="text-muted-foreground hover:text-foreground"
          >
            <Users className="h-4 w-4" />
          </Button>
         
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMobile && (
                <>
                  <DropdownMenuItem onClick={() => onStartVideoCall('audio')}>
                    <Phone className="h-4 w-4 mr-2" />
                    Audio Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStartVideoCall('video')}>
                    <Video className="h-4 w-4 mr-2" />
                    Video Call
                  </DropdownMenuItem>
                </>
              )}
              {isChannelAdmin && (
                <DropdownMenuItem onClick={onShowChannelSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Channel Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canShowAvailability && onToggleAvailable && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              <Label htmlFor="avail-header" className="text-xs text-muted-foreground">Available</Label>
              <Switch id="avail-header" checked={!!available} onCheckedChange={onToggleAvailable} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

