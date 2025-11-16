import { Fragment } from 'react';
import { Award, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  xpValue?: number;
  earnedAt?: string | Date | null;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BadgesGalleryProps {
  badges: (GamificationBadge & { locked?: boolean })[];
  loading?: boolean;
  columns?: number;
  className?: string;
  title?: string;
  description?: string;
}

const lockedClasses = 'grayscale opacity-40';

export function BadgesGallery({
  badges,
  loading,
  columns = 3,
  className,
  title = 'Badges & Milestones',
  description = 'Unlock new achievements as XP accumulates across modules.',
}: BadgesGalleryProps) {
  const columnClass = cn(
    'grid grid-cols-2 gap-4 sm:grid-cols-3',
    {
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
    }[Math.min(Math.max(columns, 2), 5)],
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: columns * 2 }).map((_, index) => (
            <Skeleton key={`badge-skeleton-${index}`} className="h-24 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No badges available yet. Automations will surface achievements here once XP accrues.
          </div>
        ) : (
          <div className={columnClass}>
            {badges.map((badge) => {
              const Icon = badge.icon ?? Award;
              const earned = !badge.locked;
              const badgeContent = (
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-2xl border border-border bg-gradient-to-br from-background to-muted/60 p-4 text-left shadow-sm transition hover:border-primary/40',
                    earned ? 'shadow-primary/20 hover:shadow-lg hover:shadow-primary/20' : lockedClasses,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    {earned ? (
                      <Badge variant="outline" className="text-[10px]">
                        {badge.xpValue ? `+${badge.xpValue} XP` : 'Unlocked'}
                      </Badge>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold leading-tight">{badge.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                  </div>
                  {earned && badge.earnedAt ? (
                    <p className="mt-auto text-[11px] uppercase tracking-wide text-emerald-600">
                      Earned {typeof badge.earnedAt === 'string' ? badge.earnedAt : badge.earnedAt.toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
              );

              return (
                <Fragment key={badge.id}>
                  <HoverCard>
                    <HoverCardTrigger asChild>{badgeContent}</HoverCardTrigger>
                    <HoverCardContent className="w-72 text-sm">
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                      {badge.xpValue ? <p className="mt-2 text-xs text-primary">Worth {badge.xpValue} XP</p> : null}
                      {badge.earnedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Earned {typeof badge.earnedAt === 'string' ? badge.earnedAt : badge.earnedAt.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Unlock by completing the recommended activity.</p>
                      )}
                    </HoverCardContent>
                  </HoverCard>
                </Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
