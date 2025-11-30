import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { LearningCourseMetrics } from '@/types/learning';

interface LearningAnalyticsProps {
  metrics: LearningCourseMetrics[];
  loading: boolean;
}

export function LearningAnalytics({ metrics, loading }: LearningAnalyticsProps) {
  if (!loading && metrics.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Learning analytics</CardTitle>
          <CardDescription>No analytics to display</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Once employees enroll in courses, aggregated metrics will show up here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Learning analytics</CardTitle>
        <CardDescription>Course performance insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && metrics.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))
          : metrics.slice(0, 5).map((metric) => (
              <div key={metric.courseId} className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-semibold">{metric.title}</p>
                <p className="text-xs text-muted-foreground">
                  {metric.activeLearners} active · {metric.completions} completions
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg. progress {metric.avgProgress ? Math.round(metric.avgProgress) : 0}% ·{' '}
                  {metric.totalXpAwarded?.toLocaleString() ?? 0} XP
                </p>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

export default LearningAnalytics;
