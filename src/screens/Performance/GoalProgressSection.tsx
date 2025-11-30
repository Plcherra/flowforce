import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export interface GoalSummaryCard {
  id: string;
  title: string;
  status: string;
  progress: number;
  targetDate?: string | null;
}

interface GoalProgressSectionProps {
  goals: GoalSummaryCard[];
  loading: boolean;
}

export function GoalProgressSection({ goals, loading }: GoalProgressSectionProps) {
  if (loading && goals.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && goals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Goal progress</CardTitle>
          <CardDescription>No active goals were found.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Start tracking goals in Supabase to visualize team progress here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Goal progress</CardTitle>
        <CardDescription>Top goals ranked by completion percentage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="space-y-1">
            <div className="flex flex-col justify-between gap-1 text-sm font-medium text-foreground sm:flex-row sm:items-center">
              <p>{goal.title}</p>
              <span className="text-xs capitalize text-muted-foreground">
                {goal.status.replace(/_/g, ' ')}
                {goal.targetDate ? ` · due ${new Date(goal.targetDate).toLocaleDateString()}` : ''}
              </span>
            </div>
            <Progress value={goal.progress} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default GoalProgressSection;
