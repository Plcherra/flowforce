import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Reply, Users, X, Send } from 'lucide-react';
import { format } from 'date-fns';

interface ThreadMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  parentId?: string;
  replies?: ThreadMessage[];
  replyCount?: number;
}

interface ThreadedMessageViewProps {
  message: ThreadMessage;
  allReplies: ThreadMessage[];
  onClose: () => void;
  onSendReply: (content: string, parentId?: string) => void;
  className?: string;
}

const getInitialsFromName = (name: string) => {
  const safeName = name.trim();
  if (!safeName) return 'U';
  const segments = safeName.split(/\s+/).filter(Boolean);
  if (segments.length === 0) return 'U';
  if (segments.length === 1) return segments[0].slice(0, 2).toUpperCase();
  return (segments[0][0] ?? 'U').toUpperCase() + (segments[1][0] ?? '').toUpperCase();
};

const formatThreadTimestamp = (value: Date) => {
  if (!(value instanceof Date)) return '';
  const time = value.getTime();
  if (Number.isNaN(time)) return '';
  return format(value, 'MMM dd, h:mm a');
};

export function ThreadedMessageView({ 
  message, 
  allReplies, 
  onClose, 
  onSendReply, 
  className = '' 
}: ThreadedMessageViewProps) {
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyTo, setActiveReplyTo] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<ThreadMessage[]>([]);

  useEffect(() => {
    // Filter replies that belong to this thread
    const replies = allReplies.filter(reply => 
      reply.parentId === message.id || 
      allReplies.some(r => r.id === reply.parentId && r.parentId === message.id)
    );
    setThreadReplies(replies);
  }, [allReplies, message.id]);

  const handleSendReply = () => {
    if (!replyContent.trim()) return;

    onSendReply(replyContent, activeReplyTo || message.id);
    setReplyContent('');
    setActiveReplyTo(null);
  };

  const handleReplyToMessage = (messageId: string) => {
    setActiveReplyTo(messageId);
  };

  const getMessageLevel = (msg: ThreadMessage): number => {
    if (msg.id === message.id) return 0;
    if (msg.parentId === message.id) return 1;
    
    const parent = allReplies.find(r => r.id === msg.parentId);
    if (parent && parent.parentId === message.id) return 2;
    
    return 1; // Default to level 1 for safety
  };

  const renderMessage = (msg: ThreadMessage, level: number = 0) => {
    const displayName = msg.sender.name?.trim() || 'Unknown teammate';
    const initials = getInitialsFromName(displayName);
    const createdAtLabel = formatThreadTimestamp(msg.createdAt);
    const indentation = level > 0 ? Math.min(level * 24, 48) : 0;

    return (
      <div
        key={msg.id}
        className={`flex gap-3 rounded-lg p-3 ${
          level === 0 ? 'bg-muted/50' : level === 1 ? 'bg-background' : 'bg-muted/30'
        }`}
        style={{ marginLeft: indentation }}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          {msg.sender.avatar ? <AvatarImage src={msg.sender.avatar} alt={displayName} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            {createdAtLabel && <span className="text-xs text-muted-foreground">{createdAtLabel}</span>}
            {level === 0 && (
              <Badge variant="outline" className="text-xs">
                Original
              </Badge>
            )}
          </div>

          <p className="mb-2 text-sm leading-relaxed text-foreground">{msg.content}</p>

          {level < 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleReplyToMessage(msg.id)}
            >
              <Reply className="mr-1 h-3 w-3" />
              Reply
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Thread
            <Badge variant="secondary" className="text-xs">
              {threadReplies.length + 1} messages
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Thread Messages */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-3">
            {/* Original Message */}
            {renderMessage(message, 0)}
            
            {/* Replies */}
            {threadReplies
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .map(reply => renderMessage(reply, getMessageLevel(reply)))
            }
          </div>
        </ScrollArea>

        {/* Reply Input */}
        <div className="border-t pt-4">
          {activeReplyTo && activeReplyTo !== message.id && (
            <div className="mb-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>
                  Replying to{' '}
                  {allReplies.find(r => r.id === activeReplyTo)?.sender.name || 'message'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setActiveReplyTo(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder={
                activeReplyTo && activeReplyTo !== message.id 
                  ? "Reply to message..." 
                  : "Reply to thread..."
              }
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleSendReply}
              disabled={!replyContent.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
