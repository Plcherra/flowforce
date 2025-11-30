import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export interface XpTrendEntry {
  id: string;
  name: string;
  xp: number;
  department?: string | null;
}

interface XPTrendsSectionProps {
  xpBySource: Record<string, number>;
  leaderboard: XpTrendEntry[];
  loading: boolean;
}

const sourceLabels: Record<string, string> = {
  tasks: 'Tasks',
  goals: 'Goals',
  recognitions: 'Recognitions',
  training: 'Training',
};

export function XPTrendsSection({ xpBySource, leaderboard, loading }: XPTrendsSectionProps) {
  const total = Object.values(xpBySource).reduce((sum, value) => sum + value, 0);

  if (loading && leaderboard.length === 0 && total === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-60" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && total === 0 && leaderboard.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">XP trends</CardTitle>
          <CardDescription>No leaderboard entries yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Once employees start completing tasks, goals, or training, XP trends will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">XP trends</CardTitle>
        <CardDescription>Breakdown of points earned this period</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {Object.entries(xpBySource).map(([key, value]) => {
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm font-medium">
                  <p>{sourceLabels[key] ?? key}</p>
                  <span>{value.toLocaleString()} XP</span>
                </div>
                <Progress value={percent} className="mt-1" />
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div key={entry.id} className="rounded-xl border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{entry.name}</p>
              <p className="text-xs text-muted-foreground">
                {entry.department ?? 'No department'} · {entry.xp.toLocaleString()} XP
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default XPTrendsSection;
