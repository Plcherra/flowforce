import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  MessageCircle,
  Eye,
  Pin,
  MoreHorizontal,
  Archive,
  Trash2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { getBackgroundCss, getTypeColor, getUpdateIcon, getEngagementSettings } from '@/features/company-updates/utils';
import type { CompanyUpdate, UpdateComment } from '@/types/companyUpdates';

interface UpdateFeedCardProps {
  update: CompanyUpdate;
  comments: UpdateComment[];
  showComments: boolean;
  commentValue: string;
  onCommentChange: (updateId: string, value: string) => void;
  onSubmitComment: (update: CompanyUpdate) => void;
  onToggleComments: (update: CompanyUpdate) => void;
  onLike: (update: CompanyUpdate) => void;
  onArchive: (updateId: string) => void;
  onDelete: (updateId: string) => void;
  canManage: boolean;
  markAsViewed: (updateId: string) => void;
}

export function UpdateFeedCard({
  update,
  comments,
  showComments,
  commentValue,
  onCommentChange,
  onSubmitComment,
  onToggleComments,
  onLike,
  onArchive,
  onDelete,
  canManage,
  markAsViewed,
}: UpdateFeedCardProps) {
  const engagement = useMemo(() => getEngagementSettings(update), [update]);
  const isLiked = Boolean(update.viewerHasLiked);

  useEffect(() => {
    markAsViewed(update.id);
  }, [markAsViewed, update.id]);

  return (
    <Card className={update.isPinned ? 'ring-2 ring-primary/20 bg-primary/5' : ''}>
      {update.backgroundStyle && (
        <div className="h-2 w-full" style={{ background: getBackgroundCss(update.backgroundStyle) }} />
      )}
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={update.author.avatar} />
              <AvatarFallback className="text-xs">
                {update.author.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{update.author.name}</h3>
                <Badge variant="outline" className="text-xs shrink-0">
                  {update.author.role}
                </Badge>
                {update.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(update.publishDate), { addSuffix: true })}
                </span>
                <Badge className={`text-xs ${getTypeColor(update.type)} flex items-center gap-1`}>
                  {getUpdateIcon(update.type)}
                  <span className="capitalize">{update.type}</span>
                </Badge>
              </div>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onArchive(update.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(update.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-2 leading-tight">{update.title}</h2>
            {update.richContent ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: update.richContent }}
              />
            ) : (
              <p className="text-foreground leading-relaxed text-sm">{update.content}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground py-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{update.views}</span>
            </div>
            {engagement.allowLikes && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{update.likes}</span>
              </div>
            )}
            {engagement.allowComments && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{update.comments}</span>
              </div>
            )}
          </div>

          {(engagement.allowLikes || engagement.allowComments) && (
            <div className="flex items-center gap-1">
              {engagement.allowLikes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLike(update)}
                  className={`h-8 px-3 ${isLiked ? 'text-red-600 hover:text-red-700' : ''}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs">Like</span>
                </Button>
              )}
              {engagement.allowComments && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleComments(update)}
                  className="h-8 px-3"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Comment</span>
                </Button>
              )}
            </div>
          )}

          {engagement.allowComments && showComments && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentValue}
                  onChange={(event) => onCommentChange(update.id, event.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => onSubmitComment(update)}
                    disabled={!commentValue?.trim()}
                    className="h-8"
                  >
                    <span className="text-xs">Post</span>
                  </Button>
                </div>
              </div>

              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={comment.author.avatar} />
                    <AvatarFallback className="text-xs">
                      {comment.author.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs truncate">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{comment.content}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-2 mt-1">
                      <Heart className="h-3 w-3 mr-1" />
                      <span className="text-xs">{comment.likes}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
