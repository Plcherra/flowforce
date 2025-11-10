import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, addMinutes, differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import {
  AlarmClock,
  ClipboardList,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useReminders } from '@/hooks/useReminders';
import { useScenarioSimulator } from '@/hooks/useScenarioSimulator';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_ADJUSTMENTS } from '@/lib/ai/scenarioEngine';
import { cn } from '@/lib/utils';

type QuickActionSource = 'copilot' | 'tasks' | 'reminders' | 'goals';

interface QuickActionMetric {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface QuickActionDescriptor {
  id: QuickActionSource;
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  metrics: QuickActionMetric[];
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => Promise<void>;
  onSecondary?: () => void;
  disabled?: boolean;
}

const toneClassNames: Record<Exclude<QuickActionMetric['tone'], undefined>, string> = {
  default: 'border-border/70 bg-muted/40 text-foreground',
  success: 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700',
  warning: 'border-amber-200/70 bg-amber-50/60 text-amber-700',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function AIQuickActions({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { user } = useAuth();

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    refetchTasks,
  } = useTasks();
  const {
    goals,
    loading: goalsLoading,
    createGoal,
    calculateGoalProgress,
    refetchGoals,
  } = useGoals();
  const {
    reminders,
    loading: remindersLoading,
    createReminder,
    refetchReminders,
  } = useReminders();
  const {
    simulate,
    triggerCopilot,
    loading: simulatorLoading,
    refresh: refreshSimulator,
  } = useScenarioSimulator({ companyId: profile?.companyId ?? undefined });

  const [pendingAction, setPendingAction] = useState<QuickActionSource | null>(null);
  const [metricsSnapshot, setMetricsSnapshot] = useState<Record<QuickActionSource, QuickActionMetric[]>>({
    copilot: [],
    tasks: [],
    reminders: [],
    goals: [],
  });

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status !== 'completed' && task.status !== 'cancelled',
      ),
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return !Number.isNaN(due.getTime()) && due < new Date();
      }),
    [activeTasks],
  );

  const dueSoonTasks = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        if (Number.isNaN(due.getTime()) || due < new Date()) return false;
        return differenceInCalendarDays(due, new Date()) <= 3;
      }),
    [activeTasks],
  );

  const pendingReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.completed),
    [reminders],
  );

  const overdueReminders = useMemo(
    () =>
      pendingReminders.filter((reminder) => {
        const remindAt = new Date(reminder.remind_at);
        return !Number.isNaN(remindAt.getTime()) && remindAt < new Date();
      }),
    [pendingReminders],
  );

  const nextReminder = useMemo(() => {
    const upcoming = pendingReminders
      .filter((reminder) => {
        const remindAt = new Date(reminder.remind_at);
        if (Number.isNaN(remindAt.getTime())) return false;
        return remindAt >= new Date();
      })
      .sort(
        (a, b) =>
          new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
      );
    return upcoming[0] ?? null;
  }, [pendingReminders]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active'),
    [goals],
  );

  const atRiskGoals = useMemo(
    () =>
      activeGoals.filter((goal) => {
        const progress = calculateGoalProgress(goal);
        const dueDate = goal.target_completion_date
          ? new Date(goal.target_completion_date)
          : null;

        if (progress >= 70 && (!dueDate || dueDate > new Date())) {
          return false;
        }

        if (!dueDate) {
          return progress < 60;
        }

        if (dueDate < new Date()) {
          return progress < 100;
        }

        return differenceInCalendarDays(dueDate, new Date()) <= 30 && progress < 70;
      }),
    [activeGoals, calculateGoalProgress],
  );

  const averageGoalProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const total = activeGoals.reduce(
      (acc, goal) => acc + calculateGoalProgress(goal),
      0,
    );
    return Math.round(total / activeGoals.length);
  }, [activeGoals, calculateGoalProgress]);

  useEffect(() => {
    const copilotOutcome = simulate(DEFAULT_ADJUSTMENTS);
    const coverageDelta = Math.round(copilotOutcome.deltas.coverageRate * 100);
    const backlogDelta = copilotOutcome.deltas.backlog;
    const marginDelta = Math.round(copilotOutcome.deltas.marginRate * 100);

    const copilotMetrics: QuickActionMetric[] = [
      {
        label: 'Coverage delta',
        value: `${coverageDelta >= 0 ? '+' : ''}${coverageDelta}%`,
        tone: coverageDelta >= 0 ? 'success' : 'warning',
      },
      {
        label: 'Backlog shift',
        value:
          backlogDelta < 0
            ? `${Math.abs(backlogDelta)} tasks cleared`
            : `${backlogDelta} tasks added`,
        tone: backlogDelta < 0 ? 'success' : 'warning',
      },
      {
        label: 'Margin change',
        value: `${marginDelta >= 0 ? '+' : ''}${marginDelta}%`,
        tone: marginDelta >= 0 ? 'success' : 'warning',
      },
    ];

    const tasksMetrics: QuickActionMetric[] = [
      {
        label: 'Active backlog',
        value: `${activeTasks.length} open`,
        tone: activeTasks.length > 20 ? 'warning' : 'default',
      },
      {
        label: 'Overdue',
        value: `${overdueTasks.length}`,
        tone: overdueTasks.length > 0 ? 'danger' : 'success',
      },
      {
        label: 'Due soon (≤3d)',
        value: `${dueSoonTasks.length}`,
        tone: dueSoonTasks.length > 3 ? 'warning' : 'default',
      },
    ];

    const remindersMetrics: QuickActionMetric[] = [
      {
        label: 'Pending',
        value: `${pendingReminders.length}`,
        tone: pendingReminders.length > 5 ? 'warning' : 'default',
      },
      {
        label: 'Overdue reminders',
        value: `${overdueReminders.length}`,
        tone: overdueReminders.length > 0 ? 'danger' : 'success',
      },
      {
        label: 'Next alert',
        value: nextReminder
          ? formatDistanceToNow(new Date(nextReminder.remind_at), {
              addSuffix: true,
            })
          : 'None scheduled',
        tone: nextReminder ? 'default' : 'warning',
      },
    ];

    const goalsMetrics: QuickActionMetric[] = [
      {
        label: 'Active goals',
        value: `${activeGoals.length}`,
        tone: activeGoals.length === 0 ? 'warning' : 'default',
      },
      {
        label: 'At risk',
        value: `${atRiskGoals.length}`,
        tone: atRiskGoals.length > 0 ? 'danger' : 'success',
      },
      {
        label: 'Average progress',
        value: `${averageGoalProgress}%`,
        tone: averageGoalProgress >= 75 ? 'success' : 'warning',
      },
    ];

    setMetricsSnapshot({
      copilot: copilotMetrics,
      tasks: tasksMetrics,
      reminders: remindersMetrics,
      goals: goalsMetrics,
    });
  }, [
    activeGoals,
    activeTasks.length,
    atRiskGoals.length,
    averageGoalProgress,
    dueSoonTasks.length,
    overdueReminders.length,
    overdueTasks.length,
    pendingReminders.length,
    simulate,
    nextReminder,
  ]);

  const handleTriggerCopilot = useCallback(async () => {
    setPendingAction('copilot');
    try {
      const outcome = simulate(DEFAULT_ADJUSTMENTS);
      const actions = outcome.copilotActions;

      if (!actions || actions.length === 0) {
        throw new Error('Co-Pilot did not generate any automation tasks.');
      }

      const result = await triggerCopilot(actions);

      toast({
        title: 'Co-Pilot automation queued',
        description: `Created ${result.created} task${result.created === 1 ? '' : 's'} for automation follow-up.`,
      });

      await Promise.allSettled([refreshSimulator(), refetchTasks?.()]);
    } catch (error) {
      toast({
        title: 'Unable to trigger Co-Pilot',
        description: error instanceof Error ? error.message : 'Unexpected automation failure.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction((current) => (current === 'copilot' ? null : current));
    }
  }, [refreshSimulator, refetchTasks, simulate, toast, triggerCopilot]);

  const handleCreateBacklogTask = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Sign-in required',
        description: 'You must be signed in to assign follow-up tasks.',
        variant: 'destructive',
      });
      return;
    }

    if (!createTask) {
      toast({
        title: 'Task service unavailable',
        description: 'Unable to reach the task service right now.',
        variant: 'destructive',
      });
      return;
    }

    setPendingAction('tasks');
    try {
      const dueDate = addDays(new Date(), overdueTasks.length > 0 ? 1 : 2).toISOString();
      const priority = overdueTasks.length >= 5 ? 'urgent' : overdueTasks.length > 0 ? 'high' : 'medium';

      const payload = {
        title: '[AI] Backlog recovery sprint',
        description: `AI quick actions detected ${
          overdueTasks.length
        } overdue task${overdueTasks.length === 1 ? '' : 's'} and ${
          dueSoonTasks.length
        } due soon. Coordinate owners and unblock progress.`,
        status: 'todo' as const,
        priority,
        created_by: user.id,
        due_date: dueDate,
        tags: ['ai', 'quick-action'],
      };

      const { error } = await createTask(payload);

      if (error) {
        throw error;
      }

      toast({
        title: 'Follow-up task created',
        description: 'Backlog recovery task assigned. Track progress from the task board.',
      });

      await refetchTasks?.();
    } catch (error) {
      toast({
        title: 'Unable to create task',
        description: error instanceof Error ? error.message : 'Unexpected task creation error.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction((current) => (current === 'tasks' ? null : current));
    }
  }, [
    createTask,
    dueSoonTasks.length,
    overdueTasks.length,
    refetchTasks,
    toast,
    user,
  ]);

  const handleCreateReminder = useCallback(async () => {
    setPendingAction('reminders');
    try {
      await createReminder({
        title: 'AI follow-up: backlog check-in',
        description:
          overdueTasks.length > 0
            ? `Coordinate a quick sync to close ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}.`
            : 'Confirm backlog owners are progressing as planned.',
        remind_at: addMinutes(new Date(), 45).toISOString(),
        type: 'task',
        priority: overdueTasks.length > 0 ? 'high' : 'medium',
        sound_enabled: true,
        sound_type: 'notify',
        notification_methods: ['in_app'],
        repeat_enabled: false,
        repeat_interval: null,
        snooze_enabled: true,
        auto_complete: false,
        snooze_count: 0,
      });

      toast({
        title: 'Reminder scheduled',
        description: 'We will remind you shortly to close the loop on these insights.',
      });

      await refetchReminders?.();
    } catch (error) {
      toast({
        title: 'Unable to create reminder',
        description: error instanceof Error ? error.message : 'Unexpected reminder error.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction((current) => (current === 'reminders' ? null : current));
    }
  }, [createReminder, overdueTasks.length, refetchReminders, toast]);

  const handleCreateGoal = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Sign-in required',
        description: 'You must be signed in to create goals.',
        variant: 'destructive',
      });
      return;
    }

    setPendingAction('goals');
    try {
      const targetCompletion = addDays(new Date(), 28).toISOString();

      await createGoal({
        title: '[AI] Goal checkpoint sprint',
        description:
          atRiskGoals.length > 0
            ? `Stabilise ${atRiskGoals.length} at-risk goal${atRiskGoals.length === 1 ? '' : 's'} with milestone owners.`
            : 'Lock in current momentum by aligning the team on a short sprint objective.',
        status: 'active',
        priority: atRiskGoals.length > 0 ? 'high' : 'medium',
        target_completion_date: targetCompletion,
      });

      toast({
        title: 'Goal launched',
        description: 'New checkpoint goal created. Assign tasks from the goal workspace.',
      });

      await refetchGoals?.();
    } catch (error) {
      toast({
        title: 'Unable to create goal',
        description: error instanceof Error ? error.message : 'Unexpected goal creation error.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction((current) => (current === 'goals' ? null : current));
    }
  }, [atRiskGoals.length, createGoal, refetchGoals, toast, user]);

  const quickActions: QuickActionDescriptor[] = useMemo(
    () => [
      {
        id: 'copilot',
        badge: 'Co-Pilot',
        title: 'Trigger automation playbook',
        description:
          'Generate recommended follow-up tasks from Co-Pilot and push them to the automation queue.',
        icon: <Sparkles className="h-5 w-5 text-primary" />,
        metrics: metricsSnapshot.copilot,
        primaryLabel: 'Trigger Co-Pilot',
        secondaryLabel: 'Open simulator',
        onPrimary: handleTriggerCopilot,
        onSecondary: () => navigate('/ai-insights?tab=simulator'),
        disabled: simulatorLoading,
      },
      {
        id: 'tasks',
        badge: 'Tasks',
        title: 'Assign backlog recovery',
        description:
          overdueTasks.length > 0
            ? `Coordinate owners to close ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}.`
            : 'Stay ahead of upcoming deadlines by issuing a quick checkpoint task.',
        icon: <ClipboardList className="h-5 w-5 text-blue-600" />,
        metrics: metricsSnapshot.tasks,
        primaryLabel: 'Create follow-up task',
        secondaryLabel: 'Open tasks',
        onPrimary: handleCreateBacklogTask,
        onSecondary: () => navigate('/tasks'),
      },
      {
        id: 'reminders',
        badge: 'Reminders',
        title: 'Schedule follow-up reminder',
        description:
          overdueReminders.length > 0
            ? `There are ${overdueReminders.length} overdue reminder${overdueReminders.length === 1 ? '' : 's'}. Queue a short follow-up.`
            : 'Keep the loop tight by setting a quick reminder to review progress.',
        icon: <AlarmClock className="h-5 w-5 text-rose-600" />,
        metrics: metricsSnapshot.reminders,
        primaryLabel: 'Set reminder',
        secondaryLabel: 'View reminders',
        onPrimary: handleCreateReminder,
        onSecondary: () => navigate('/tasks#reminders'),
      },
      {
        id: 'goals',
        badge: 'Goals',
        title: 'Launch checkpoint goal',
        description:
          atRiskGoals.length > 0
            ? `Stabilise ${atRiskGoals.length} goal${atRiskGoals.length === 1 ? '' : 's'} trending behind.`
            : 'Lock in velocity by capturing a short checkpoint goal with linked tasks.',
        icon: <Target className="h-5 w-5 text-purple-600" />,
        metrics: metricsSnapshot.goals,
        primaryLabel: 'Create goal sprint',
        secondaryLabel: 'Review goals',
        onPrimary: handleCreateGoal,
        onSecondary: () => navigate('/goals'),
      },
    ],
    [
      atRiskGoals.length,
      handleCreateBacklogTask,
      handleCreateGoal,
      handleCreateReminder,
      handleTriggerCopilot,
      metricsSnapshot,
      navigate,
      overdueReminders.length,
      overdueTasks.length,
      simulatorLoading,
    ],
  );

  const overallLoading = tasksLoading || goalsLoading || remindersLoading;

  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions & Automation
        </CardTitle>
        <CardDescription>
          Fix, assign, or remind in seconds using live signals from Co-Pilot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {overallLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`quick-action-skeleton-${index}`}
                className="rounded-lg border border-dashed border-border/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-64" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-8 w-32 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  'rounded-lg border border-border/60 bg-muted/30 p-4',
                  pendingAction === action.id && 'border-primary/60 bg-primary/5',
                )}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-1 gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm">
                      {action.icon}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                          {action.badge}
                        </Badge>
                        {pendingAction === action.id && (
                          <Badge variant="outline" className="text-xs text-primary">
                            Working…
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      {action.metrics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {action.metrics.map((metric, index) => (
                            <div
                              key={`${action.id}-metric-${index}`}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium',
                                metric.tone ? toneClassNames[metric.tone] : toneClassNames.default,
                              )}
                            >
                              <span className="text-muted-foreground/80">{metric.label}:</span>{' '}
                              <span className="text-foreground">{metric.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <Button
                      size="sm"
                      disabled={pendingAction !== null || action.disabled}
                      onClick={() => {
                        setPendingAction(action.id);
                        void action
                          .onPrimary()
                          .finally(() =>
                            setPendingAction((current) =>
                              current === action.id ? null : current,
                            ),
                          );
                      }}
                    >
                      {pendingAction === action.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {action.primaryLabel}
                    </Button>
                    {action.secondaryLabel && action.onSecondary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={action.onSecondary}
                        disabled={pendingAction !== null}
                      >
                        {action.secondaryLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIQuickActions;
