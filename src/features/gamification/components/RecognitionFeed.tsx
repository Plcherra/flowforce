import { formatDistanceToNow } from 'date-fns';
import { Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface RecognitionFeedItem {
  id: string;
  name: string;
  badgeLabel?: string;
  badgeClassName?: string;
  message?: string;
  xpSnapshot?: number;
  createdAt: string | Date;
  avatarUrl?: string;
  initials?: string;
}

interface RecognitionFeedProps {
  events: RecognitionFeedItem[];
  loading?: boolean;
  maxItems?: number;
  className?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function RecognitionFeed({
  events,
  loading,
  maxItems = 6,
  className,
  title = 'Recent Recognition',
  description = 'Live activity from automations, milestones, and shout-outs.',
  emptyMessage = 'No recognition activity yet. Launch automations or celebrate a teammate to populate this feed.',
}: RecognitionFeedProps) {
  const items = events.slice(0, maxItems);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: maxItems }).map((_, index) => (
            <Skeleton key={`feed-skeleton-${index}`} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <ScrollArea className="h-[320px]">
            <ul className="divide-y">
              {items.map((event) => {
                const initials =
                  event.initials ??
                  event.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                const awardedDistance = formatDistanceToNow(new Date(event.createdAt), { addSuffix: true });
                return (
                  <li key={event.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30">
                    <Avatar className="h-11 w-11 border border-primary/30">
                      <AvatarImage src={event.avatarUrl ?? undefined} alt={event.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm">{event.name}</p>
                        {event.badgeLabel ? (
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] uppercase tracking-wide', event.badgeClassName)}
                          >
                            {event.badgeLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{event.message ?? 'Recognition unlocked'}</p>
                    </div>
                    <div className="text-right text-xs">
                      {event.xpSnapshot != null ? (
                        <p className="font-semibold text-foreground">+{event.xpSnapshot} XP</p>
                      ) : null}
                      <p className="text-muted-foreground">{awardedDistance}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
