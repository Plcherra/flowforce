import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

export interface BadgeCard {
  id: string;
  name: string;
  description: string;
  current: number;
  required: number;
  xpValue: number;
}

interface BadgeGridProps {
  badges: BadgeCard[];
  loading: boolean;
}

export function BadgeGrid({ badges, loading }: BadgeGridProps) {
  if (loading && badges.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-xl border bg-muted/20 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && badges.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Recognition badges
          </CardTitle>
          <CardDescription>No badges unlocked yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Recognitions award XP automatically. Once Copilot detects progress toward a badge it appears here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-primary" />
          Recognition badges
        </CardTitle>
        <CardDescription>Progress towards automation-driven rewards</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {badges.map((badge) => {
          const percent = badge.required > 0 ? Math.min(Math.round((badge.current / badge.required) * 100), 100) : 0;
          return (
            <div key={badge.id} className="space-y-2 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
                <span className="text-xs font-semibold text-primary">{badge.xpValue} XP</span>
              </div>
              <Progress value={percent} />
              <p className="text-xs text-muted-foreground">
                {badge.current}/{badge.required} actions completed
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default BadgeGrid;
