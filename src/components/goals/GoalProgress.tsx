import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CheckCircle2, Rocket, ClipboardList, Ban } from 'lucide-react';
import type { GoalStats } from '@/hooks/useGoals';

interface GoalProgressProps {
  totals: GoalStats;
  isLoading?: boolean;
}

const metricConfig = [
  {
    key: 'total' as const,
    title: 'Total Goals',
    icon: ClipboardList,
    accent: 'bg-primary/10 text-primary',
  },
  {
    key: 'active' as const,
    title: 'Active',
    icon: Rocket,
    accent: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  {
    key: 'completed' as const,
    title: 'Completed',
    icon: CheckCircle2,
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    key: 'drafts' as const,
    title: 'Drafts',
    icon: Target,
    accent: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  },
  {
    key: 'cancelled' as const,
    title: 'Cancelled',
    icon: Ban,
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  },
];

export function GoalProgress({ totals, isLoading }: GoalProgressProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {metricConfig.map(({ key, title, icon: Icon, accent }) => (
        <Card key={key} className="border border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${accent}`}>
              <Icon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16 rounded" />
            ) : (
              <p className="text-2xl font-semibold text-foreground">{totals[key]}</p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="border border-border/60 bg-background/80 shadow-sm">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-2 w-full rounded" />
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-foreground">
                {totals.averageProgress}%
              </p>
              <Progress value={totals.averageProgress} className="h-2" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
