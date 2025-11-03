import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, CalendarDays, CheckSquare, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEmployeePerformance } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { CreateGoalModal, type GoalFormValues } from '@/components/goals/CreateGoalModal';

type TaskRecord = ReturnType<typeof useTasks>['tasks'][number];
type GoalRecord = ReturnType<typeof useGoals>['goals'][number];
type TileId = 'tasks' | 'goals' | 'scheduling' | 'performance';

interface TileDescriptor {
  id: TileId;
  title: string;
  icon: LucideIcon;
  accent: string;
  metric: string;
  metricLabel: string;
  secondary: string;
  trend: 'up' | 'down' | 'flat';
  trendLabel: string;
  suggestion: string;
}

const TREND_LABEL: Record<'up' | 'down' | 'flat', { icon: typeof TrendingUp; tone: string }> = {
  up: { icon: TrendingUp, tone: 'text-emerald-500' },
  down: { icon: TrendingDown, tone: 'text-destructive' },
  flat: { icon: TrendingUp, tone: 'text-muted-foreground' },
};

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function InteractiveKpiTiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { tasks, loading: tasksLoading } = useTasks();
  const { goals, isLoading: goalsLoading, createGoal, creating } = useGoals();
  const { stats: schedulingStats, loading: schedulingLoading } = useDashboardData();
  const { data: performanceData, isLoading: performanceLoading } = useEmployeePerformance();

  const [activeTile, setActiveTile] = useState<TileId | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const isLoading = tasksLoading || goalsLoading || schedulingLoading || performanceLoading;

  const tasksMetrics = useMemo(() => {
    const now = new Date();
    const totals = {
      total: tasks.length,
      completed: 0,
      open: 0,
      overdue: 0,
      dueSoon: 0,
      highPriority: 0,
    };

    const overdueCandidates: TaskRecord[] = [];

    tasks.forEach((task) => {
      const status = (task.status ?? '').toLowerCase();
      const priority = (task.priority ?? '').toLowerCase();
      const isCompleted = status === 'completed';
      const isCancelled = status === 'cancelled';

      if (isCompleted) totals.completed += 1;

      if (!isCompleted && !isCancelled) {
        totals.open += 1;
        if (priority === 'urgent' || priority === 'high') {
          totals.highPriority += 1;
        }

        const due = safeDate(task.due_date);
        if (due) {
          if (due < now) {
            totals.overdue += 1;
            overdueCandidates.push(task);
          } else if (differenceInDays(due, now) <= 3) {
            totals.dueSoon += 1;
          }
        }
      }
    });

    const completionRate = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
    const overdueList = overdueCandidates
      .sort((a, b) => {
        const aDate = safeDate(a.due_date)?.getTime() ?? 0;
        const bDate = safeDate(b.due_date)?.getTime() ?? 0;
        return aDate - bDate;
      })
      .slice(0, 3);

    return { ...totals, completionRate, overdueList };
  }, [tasks]);

  const goalsMetrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let draft = 0;
    let totalProgress = 0;
    const activeGoals: GoalRecord[] = [];

    goals.forEach((goal) => {
      const status = (goal.status ?? '').toLowerCase();
      if (status === 'completed') {
        completed += 1;
      } else if (status === 'active') {
        active += 1;
        activeGoals.push(goal);
      } else {
        draft += 1;
      }
      totalProgress += goal.progress ?? 0;
    });

    const averageProgress = goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;
    const topActive = activeGoals
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 3);

    return { total: goals.length, active, completed, draft, averageProgress, topActive };
  }, [goals]);

  const schedulingMetrics = useMemo(() => {
    const coverage =
      schedulingStats.totalEmployees > 0
        ? Math.round((schedulingStats.activeEmployees / schedulingStats.totalEmployees) * 100)
        : 0;
    const hasCapacityGap = coverage < 70;

    return {
      coverage,
      todaysShifts: schedulingStats.todaysShifts,
      pendingTimeOff: schedulingStats.pendingTimeOff,
      hasCapacityGap,
    };
  }, [schedulingStats]);

  const performanceMetrics = useMemo(() => {
    const entries =
      (performanceData as Array<{
        completion_rate?: number | null;
        first_name?: string | null;
        last_name?: string | null;
        tasks?: number | null;
      }> | null) ?? [];

    if (entries.length === 0) {
      return {
        averageCompletionRate: 0,
        topPerformer: null as (typeof entries)[number] | null,
        topContributors: [] as typeof entries,
      };
    }

    const averageCompletionRate = Math.round(
      entries.reduce((sum, entry) => sum + (entry.completion_rate ?? 0), 0) / entries.length
    );
    const sortedByCompletion = [...entries].sort(
      (a, b) => (b.completion_rate ?? 0) - (a.completion_rate ?? 0)
    );

    return {
      averageCompletionRate,
      topPerformer: sortedByCompletion[0] ?? null,
      topContributors: sortedByCompletion.slice(0, 4),
    };
  }, [performanceData]);

  const copilotMessages = useMemo(() => {
    return {
      tasks:
        tasksMetrics.overdue > 0
          ? `Co-Pilot flagged ${tasksMetrics.overdue} overdue task${tasksMetrics.overdue === 1 ? '' : 's'} and is prioritising recovery playbooks for today.`
          : tasksMetrics.dueSoon > 0
            ? `Co-Pilot suggests pre-assigning ${tasksMetrics.dueSoon} task${tasksMetrics.dueSoon === 1 ? '' : 's'} due soon so nothing slips before the weekend.`
            : 'Co-Pilot confirms the task queue is cleared. This is a great moment to launch follow-up improvements.',
      goals:
        goalsMetrics.active === 0
          ? 'Co-Pilot recommends launching a mission-critical goal to keep momentum aligned with quarterly outcomes.'
          : goalsMetrics.averageProgress < 60
            ? `Co-Pilot wants to tighten follow-through — average progress is ${goalsMetrics.averageProgress}%. Consider a checkpoint huddle.`
            : 'Co-Pilot is happy with goal velocity. Capture any wins in recognition before the cycle ends.',
      scheduling:
        schedulingMetrics.pendingTimeOff > 4
          ? `Co-Pilot spotted ${schedulingMetrics.pendingTimeOff} pending time-off requests. Queue a coverage sweep before publishing shifts.`
          : schedulingMetrics.hasCapacityGap
            ? 'Co-Pilot noticed coverage dipping below 70%. Running a quick balance will steady the floor.'
            : 'Co-Pilot confirms coverage looks solid. Keep an eye on new requests as they flow in.',
      performance:
        performanceMetrics.averageCompletionRate < 70
          ? `Co-Pilot suggests a coaching sprint — team completion is averaging ${performanceMetrics.averageCompletionRate}%.`
          : performanceMetrics.topPerformer
            ? `Co-Pilot wants to recognise ${
                `${performanceMetrics.topPerformer.first_name ?? ''} ${performanceMetrics.topPerformer.last_name ?? ''}`.trim() || 'your top performer'
              } for leading completion this week.`
            : 'Co-Pilot currently has limited performance data. Pull in recent reviews to unlock deeper insights.',
    } satisfies Record<TileId, string>;
  }, [goalsMetrics, performanceMetrics, schedulingMetrics, tasksMetrics]);

  const automationMessages: Record<TileId, string> = useMemo(
    () => ({
      tasks: 'Co-Pilot will assemble a recovery checklist and push the plan to the AI Actions feed.',
      goals: 'Co-Pilot will draft a refreshed OKR set and queue linked tasks for review.',
      scheduling: 'Co-Pilot will balance staffing, apply the latest preferences, and return a publishing-ready draft.',
      performance: 'Co-Pilot will compile a coaching brief with recognition and follow-up tasks.',
    }),
    []
  );

  const tiles: TileDescriptor[] = useMemo(() => {
    const tilesConfig: TileDescriptor[] = [
      {
        id: 'tasks',
        title: 'Task Execution',
        icon: CheckSquare,
        accent: 'bg-primary/10 text-primary',
        metric: tasksMetrics.total > 0 ? `${tasksMetrics.completionRate}%` : '—',
        metricLabel:
          tasksMetrics.total > 0
            ? `${tasksMetrics.completed} of ${tasksMetrics.total} completed`
            : 'No tasks created',
        secondary:
          tasksMetrics.total > 0
            ? `${tasksMetrics.overdue} overdue • ${tasksMetrics.dueSoon} due soon`
            : 'Co-Pilot is ready to open your first workflow',
        trend: tasksMetrics.overdue > 0 ? 'down' : 'up',
        trendLabel:
          tasksMetrics.total > 0
            ? tasksMetrics.overdue > 0
              ? `${tasksMetrics.overdue} to recover`
              : 'On track'
            : 'Getting started',
        suggestion: copilotMessages.tasks,
      },
      {
        id: 'goals',
        title: 'Goal Progress',
        icon: Target,
        accent: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
        metric: goalsMetrics.total > 0 ? `${goalsMetrics.averageProgress}%` : '—',
        metricLabel:
          goalsMetrics.total > 0
            ? `${goalsMetrics.active} active • ${goalsMetrics.completed} completed`
            : 'No goals in play',
        secondary:
          goalsMetrics.total > 0
            ? `${goalsMetrics.draft} draft goal${goalsMetrics.draft === 1 ? '' : 's'} waiting`
            : 'Launch your first objective to align the team',
        trend:
          goalsMetrics.total === 0
            ? 'flat'
            : goalsMetrics.averageProgress >= 70
              ? 'up'
              : 'down',
        trendLabel:
          goalsMetrics.total === 0
            ? 'No baseline yet'
            : goalsMetrics.averageProgress >= 70
              ? 'Pacing above target'
              : 'Needs lift',
        suggestion: copilotMessages.goals,
      },
      {
        id: 'scheduling',
        title: 'Scheduling Health',
        icon: CalendarDays,
        accent: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
        metric: schedulingMetrics.coverage > 0 ? `${schedulingMetrics.coverage}%` : '—',
        metricLabel: 'Coverage this week',
        secondary: `${schedulingMetrics.todaysShifts} shifts today • ${schedulingMetrics.pendingTimeOff} pending PTO`,
        trend:
          schedulingMetrics.pendingTimeOff > 4
            ? 'down'
            : schedulingMetrics.hasCapacityGap
              ? 'flat'
              : 'up',
        trendLabel:
          schedulingMetrics.pendingTimeOff > 4
            ? 'Needs review'
            : schedulingMetrics.hasCapacityGap
              ? 'Monitor coverage'
              : 'Balanced',
        suggestion: copilotMessages.scheduling,
      },
      {
        id: 'performance',
        title: 'Performance Pulse',
        icon: BarChart3,
        accent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
        metric:
          performanceMetrics.averageCompletionRate > 0
            ? `${performanceMetrics.averageCompletionRate}%`
            : '—',
        metricLabel:
          performanceMetrics.topPerformer
            ? `Top: ${`${performanceMetrics.topPerformer.first_name ?? ''} ${performanceMetrics.topPerformer.last_name ?? ''}`.trim() || 'Team Lead'}`
            : 'Awaiting data',
        secondary:
          performanceMetrics.topContributors.length > 0
            ? `${performanceMetrics.topContributors.length} standout contributor${performanceMetrics.topContributors.length === 1 ? '' : 's'}`
            : 'Bring in performance reviews to unlock insights',
        trend:
          performanceMetrics.averageCompletionRate === 0
            ? 'flat'
            : performanceMetrics.averageCompletionRate >= 75
              ? 'up'
              : 'down',
        trendLabel:
          performanceMetrics.averageCompletionRate === 0
            ? 'Need more signals'
            : performanceMetrics.averageCompletionRate >= 75
              ? 'Healthy'
              : 'Watchlist',
        suggestion: copilotMessages.performance,
      },
    ];

    return tilesConfig;
  }, [copilotMessages, goalsMetrics, performanceMetrics, schedulingMetrics, tasksMetrics]);

  const tileMap = useMemo(() => {
    return tiles.reduce<Record<TileId, TileDescriptor>>((acc, tile) => {
      acc[tile.id] = tile;
      return acc;
    }, {} as Record<TileId, TileDescriptor>);
  }, [tiles]);

  const triggerCopilotAutomation = (tile: TileId) => {
    toast({
      title: 'Co-Pilot automation queued',
      description: automationMessages[tile],
    });
  };

  const activeTileDescriptor = activeTile ? tileMap[activeTile] : undefined;
  const ActiveTileIcon = activeTileDescriptor?.icon;

  const renderMetricBlock = (label: string, value: React.ReactNode, tone: 'default' | 'warning' | 'success' = 'default') => {
    const toneClass =
      tone === 'warning'
        ? 'border-amber-300/70 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10'
        : tone === 'success'
          ? 'border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-border/60 bg-muted/40';

    return (
      <div className={cn('rounded-lg border p-3 transition', toneClass)}>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      </div>
    );
  };

  const renderActiveTileContent = (tile: TileId) => {
    switch (tile) {
      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {renderMetricBlock('Open queue', tasksMetrics.open)}
              {renderMetricBlock('Completion rate', `${tasksMetrics.completionRate}%`, tasksMetrics.completionRate >= 70 ? 'success' : 'default')}
              {renderMetricBlock('Due soon (≤3d)', tasksMetrics.dueSoon, tasksMetrics.dueSoon > 0 ? 'warning' : 'default')}
              {renderMetricBlock('High priority', tasksMetrics.highPriority, tasksMetrics.highPriority > 0 ? 'warning' : 'default')}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Overdue spotlight</h3>
              <div className="mt-3 space-y-3">
                {tasksMetrics.overdueList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No overdue tasks at the moment. Co-Pilot recommends capturing process improvements while the board is clear.
                  </p>
                ) : (
                  tasksMetrics.overdueList.map((task, index) => (
                    <div
                      key={task.id ?? `${task.title ?? 'task'}-${index}`}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{task.title || 'Untitled task'}</span>
                        {task.due_date && (
                          <Badge variant="destructive" className="text-[11px] uppercase">
                            Due {format(new Date(task.due_date), 'MMM d')}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                          {task.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Co-Pilot Recommendation
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{copilotMessages.tasks}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => triggerCopilotAutomation('tasks')}>
                  Deploy automation
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTaskDialog(true)}>
                  Create improvement task
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigate('/app/tasks');
                    setActiveTile(null);
                  }}
                >
                  Open task workspace
                </Button>
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {renderMetricBlock('Active', goalsMetrics.active)}
              {renderMetricBlock('Completed', goalsMetrics.completed, 'success')}
              {renderMetricBlock('Draft', goalsMetrics.draft, goalsMetrics.draft > 0 ? 'warning' : 'default')}
              {renderMetricBlock('Average progress', `${goalsMetrics.averageProgress}%`, goalsMetrics.averageProgress >= 70 ? 'success' : 'default')}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Momentum check</h3>
              <div className="mt-3 space-y-3">
                {goalsMetrics.topActive.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active goals detected. Co-Pilot can seed a goal framework with linked tasks in a few seconds.
                  </p>
                ) : (
                  goalsMetrics.topActive.map((goal, index) => (
                    <div
                      key={goal.id ?? `${goal.title ?? 'goal'}-${index}`}
                      className="rounded-lg border border-border/70 bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{goal.title || 'Untitled goal'}</span>
                        <span className="text-xs text-muted-foreground">{goal.progress ?? 0}%</span>
                      </div>
                      <Progress className="mt-3 h-2" value={goal.progress ?? 0} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Co-Pilot Recommendation
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{copilotMessages.goals}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => triggerCopilotAutomation('goals')}>
                  Refresh OKRs
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowGoalDialog(true)}>
                  Launch new goal
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigate('/app/goals');
                    setActiveTile(null);
                  }}
                >
                  View goal workspace
                </Button>
              </div>
            </div>
          </div>
        );

      case 'scheduling':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {renderMetricBlock('Coverage', schedulingMetrics.coverage > 0 ? `${schedulingMetrics.coverage}%` : '—')}
              {renderMetricBlock('Shifts today', schedulingMetrics.todaysShifts)}
              {renderMetricBlock('Pending PTO', schedulingMetrics.pendingTimeOff, schedulingMetrics.pendingTimeOff > 4 ? 'warning' : 'default')}
              {renderMetricBlock('Status', schedulingMetrics.hasCapacityGap ? 'Monitor' : 'Healthy', schedulingMetrics.hasCapacityGap ? 'warning' : 'success')}
            </div>

            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Co-Pilot Recommendation
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{copilotMessages.scheduling}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => triggerCopilotAutomation('scheduling')}>
                  Balance coverage
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigate('/app/enhanced-scheduling');
                    setActiveTile(null);
                  }}
                >
                  Open scheduling board
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                  navigate('/app/scheduling/timeoff');
                    setActiveTile(null);
                  }}
                >
                  Review time-off queue
                </Button>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {renderMetricBlock('Average completion', performanceMetrics.averageCompletionRate > 0 ? `${performanceMetrics.averageCompletionRate}%` : '—')}
              {renderMetricBlock(
                'Top performer',
                performanceMetrics.topPerformer
                  ? `${performanceMetrics.topPerformer.first_name ?? ''} ${performanceMetrics.topPerformer.last_name ?? ''}`.trim() || 'Team lead'
                  : 'n/a'
              )}
              {renderMetricBlock(
                'Contributors tracked',
                performanceMetrics.topContributors.length,
                performanceMetrics.topContributors.length > 0 ? 'success' : 'default'
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Standout performers</h3>
              <div className="mt-3 space-y-3">
                {performanceMetrics.topContributors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Co-Pilot needs fresh performance data to highlight coaching moments. Sync your latest reviews to continue.
                  </p>
                ) : (
                  performanceMetrics.topContributors.map((entry, index) => (
                    <div
                      key={`${entry.first_name ?? ''}-${entry.last_name ?? ''}-${index}`}
                      className="rounded-lg border border-border/70 bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {`${entry.first_name ?? ''} ${entry.last_name ?? ''}`.trim() || `Teammate ${index + 1}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(entry.tasks ?? 0) > 0 ? `${entry.tasks} tasks owned` : 'Task load syncing'}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px]">
                          {Math.round(entry.completion_rate ?? 0)}%
                        </Badge>
                      </div>
                      <Progress className="mt-3 h-2" value={entry.completion_rate ?? 0} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Co-Pilot Recommendation
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{copilotMessages.performance}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => triggerCopilotAutomation('performance')}>
                  Build coaching brief
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigate('/app/performance');
                    setActiveTile(null);
                  }}
                >
                  Open performance centre
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigate('/app/recognition');
                    setActiveTile(null);
                  }}
                >
                  Send recognition
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
        {isLoading
          ? Array.from({ length: isMobile ? 2 : 4 }).map((_, index) => (
              <Card key={`kpi-skeleton-${index}`} className="border-border/60 bg-muted/40">
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))
          : tiles.map((tile) => {
              const TrendIcon = TREND_LABEL[tile.trend].icon;

              return (
                <Card
                  key={tile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTile(tile.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveTile(tile.id);
                    }
                  }}
                  className="relative cursor-pointer border-border/70 transition hover:-translate-y-[2px] hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-semibold text-foreground">{tile.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{tile.metricLabel}</p>
                    </div>
                    <div className={cn('rounded-full p-2', tile.accent)}>
                      <tile.icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-foreground">{tile.metric}</span>
                      <span className={cn('flex items-center text-xs font-medium', TREND_LABEL[tile.trend].tone)}>
                        <TrendIcon className="mr-1 h-3 w-3" />
                        {tile.trendLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tile.secondary}</p>
                    <div className="rounded-md border border-dashed border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Co-Pilot Insight</span>
                      </div>
                      <p className="mt-2 leading-relaxed">{tile.suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Sheet
        open={Boolean(activeTile)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTile(null);
          }
        }}
      >
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('w-full', isMobile ? 'h-[85vh]' : 'sm:max-w-xl')}>
          {activeTile && (
            <>
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="flex items-center gap-2">
                  {ActiveTileIcon ? <ActiveTileIcon className="h-5 w-5 text-primary" /> : null}
                  {activeTileDescriptor?.title ?? 'Interactive insight'}
                </SheetTitle>
                <SheetDescription>
                  Powered by Co-Pilot. Drill into realtime metrics and trigger the right next action.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 overflow-y-auto pb-10 pr-1">
                {renderActiveTileContent(activeTile)}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CreateTaskDialog open={showTaskDialog} onClose={() => setShowTaskDialog(false)} />
      <CreateGoalModal
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        saving={creating}
        onSubmit={async (values: GoalFormValues) => {
          await createGoal({
            title: values.title,
            description: values.description ?? null,
            status: values.status,
            target_completion_date: values.dueDate ? values.dueDate.toISOString().split('T')[0] : null,
            priority: values.priority,
            progress: values.progress,
          });
        }}
      />
    </>
  );
}
