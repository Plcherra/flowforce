import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type InsightTone = 'purple' | 'green' | 'blue' | 'slate';

export interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  context?: string;
  tone?: InsightTone;
}

const toneClasses: Record<InsightTone, string> = {
  purple: 'border border-primary/20 bg-primary/5 text-primary dark:bg-primary/10',
  green: 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/40',
  blue: 'border border-sky-400/30 bg-sky-500/10 text-sky-700 dark:border-sky-300/40',
  slate: 'border border-border bg-muted/50 text-foreground',
};

interface InsightSummaryCardsProps {
  metrics: SummaryMetric[];
  loading: boolean;
}

export function InsightSummaryCards({ metrics, loading }: InsightSummaryCardsProps) {
  if (loading && metrics.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-dashed shadow-none">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!loading && metrics.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base font-semibold">No performance data available</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect performance reviews and goals to unlock AI summaries and XP forecasts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.id} className={`${toneClasses[metric.tone ?? 'slate']} shadow-sm`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metric.value}</p>
            {metric.context && <p className="mt-1 text-sm text-muted-foreground">{metric.context}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default InsightSummaryCards;
