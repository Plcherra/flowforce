import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  Bell,
  CalendarDays,
  ClipboardList,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  useAIActionsFeed,
  type FeedAction,
  type FeedSource,
  type FeedSeverity,
} from '@/hooks/useAIActionsFeed';
import type { TablesInsert } from '@/integrations/supabase/public-types';

const severityStyles: Record<
  FeedSeverity,
  { label: string; badge: string; dot: string; border: string; background: string }
> = {
  critical: {
    label: 'Critical',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-900/50',
    background: 'bg-red-50/60 dark:bg-red-950/40',
  },
  high: {
    label: 'High',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    dot: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-900/50',
    background: 'bg-orange-50/60 dark:bg-orange-950/30',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    dot: 'bg-amber-500',
    border: 'border-amber-200/80 dark:border-amber-900/40',
    background: 'bg-amber-50/40 dark:bg-amber-950/20',
  },
  low: {
    label: 'Low',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    dot: 'bg-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    background: 'bg-slate-50/40 dark:bg-slate-900/20',
  },
};

const sourceStyles: Record<
  FeedSource,
  { label: string; icon: LucideIcon; accent: string; chip: string }
> = {
  tasks: {
    label: 'Tasks',
    icon: ClipboardList,
    accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  },
  goals: {
    label: 'Goals',
    icon: Target,
    accent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    chip: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  },
  reminders: {
    label: 'Reminders',
    icon: AlarmClock,
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  },
  notifications: {
    label: 'Notifications',
    icon: Bell,
    accent: 'bg-slate-200 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200',
    chip: 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200',
  },
  scheduling: {
    label: 'Scheduling',
    icon: CalendarDays,
    accent: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200',
    chip: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200',
  },
  expenses: {
    label: 'Expenses',
    icon: TrendingUp,
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
};

function ActionButton({
  action,
  onClick,
  disabled,
  pending,
}: {
  action: FeedAction;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={action.variant ?? 'default'}
      onClick={onClick}
      disabled={disabled || pending}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {action.label}
    </Button>
  );
}

export function AIActionsFeed({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    items,
    loading,
    refresh,
    createTask,
    markReminderCompleted,
    snoozeReminder,
    markNotificationsRead,
    schedulingFallback,
  } = useAIActionsFeed();

  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async (itemId: string, action: FeedAction, index: number) => {
    const actionKey = `${itemId}-${index}`;

    switch (action.type) {
      case 'open_route': {
        if (action.payload.path) {
          navigate(action.payload.path);
        }
        return;
      }
      case 'create_task': {
        if (!user) {
          toast({
            title: 'Sign-in required',
            description: 'Log in to capture follow-up tasks from the feed.',
            variant: 'destructive',
          });
          return;
        }
        if (!createTask) {
          toast({
            title: 'Task creation unavailable',
            description: 'Task services are temporarily unreachable.',
            variant: 'destructive',
          });
          return;
        }

        setPendingAction(actionKey);
        try {
          const dueDate =
            action.payload.dueDateOffsetDays && action.payload.dueDateOffsetDays > 0
              ? addDays(new Date(), action.payload.dueDateOffsetDays).toISOString()
              : null;

          const taskPayload: TablesInsert<'tasks'> = {
            title: action.payload.title,
            description: action.payload.description ?? null,
            status: 'todo',
            priority: action.payload.priority ?? 'medium',
            created_by: user.id,
            due_date: dueDate,
            assigned_to: null,
            department_id: null,
            tags: null,
            attachments: [],
            parent_task_id: null,
            workflow_id: null,
            estimated_hours: null,
            actual_hours: null,
          };

          const { error } = await createTask(taskPayload);

          if (error) {
            toast({
              title: 'Unable to create task',
              description: error instanceof Error ? error.message : 'Unknown error occurred.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Follow-up scheduled',
              description: `"${taskPayload.title}" added to your task list.`,
            });
          }
        } catch (error) {
          toast({
            title: 'Unable to create task',
            description: error instanceof Error ? error.message : 'Unexpected error occurred.',
            variant: 'destructive',
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }
      case 'complete_reminder': {
        if (!markReminderCompleted) return;
        setPendingAction(actionKey);
        try {
          await markReminderCompleted(action.payload.reminderId);
        } finally {
          setPendingAction(null);
        }
        return;
      }
      case 'snooze_reminder': {
        if (!snoozeReminder) return;
        setPendingAction(actionKey);
        try {
          await snoozeReminder(action.payload.reminderId, action.payload.minutes);
          toast({
            title: 'Reminder snoozed',
            description: `We will remind you again in ${action.payload.minutes} minutes.`,
          });
        } catch (error) {
          toast({
            title: 'Unable to snooze reminder',
            description: error instanceof Error ? error.message : 'Unexpected error occurred.',
            variant: 'destructive',
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }
      case 'mark_notifications_read': {
        if (!markNotificationsRead) return;
        setPendingAction(actionKey);
        try {
          await markNotificationsRead();
          toast({
            title: 'Notifications cleared',
            description: 'All task alerts marked as read.',
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }
      case 'refresh': {
        await handleRefresh();
        return;
      }
      default:
        return;
    }
  };

  let content: ReactNode;

  if (loading) {
    content = (
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">No urgent actions detected</p>
          <p className="text-xs text-muted-foreground">
            Automations are monitoring your workspace. New recommendations will appear as data changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh feed
        </Button>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        {items.map((item) => {
          const severity = severityStyles[item.severity];
          const source = sourceStyles[item.source];
          const SourceIcon = source.icon;
          const actionPendingPrefix = `${item.id}-`;

          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                severity.background,
                severity.border,
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', source.accent)}>
                    <SourceIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                      <Badge variant="outline" className={severity.badge}>
                        {severity.label}
                      </Badge>
                      <Badge variant="secondary" className={source.chip}>
                        {source.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    {item.details && item.details.length > 0 && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {item.details.map((detail, detailIndex) => (
                          <li key={`${item.id}-detail-${detailIndex}`} className="flex items-center gap-2">
                            <span className={cn('h-1.5 w-1.5 rounded-full', severity.dot)} />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <div className="flex flex-wrap gap-2">
                    {item.actions.map((action, actionIndex) => {
                      const actionKey = `${actionPendingPrefix}${actionIndex}`;
                      return (
                        <ActionButton
                          key={actionKey}
                          action={action}
                          onClick={() => handleAction(item.id, action, actionIndex)}
                          pending={pendingAction === actionKey}
                        />
                      );
                    })}
                  </div>
                  {item.timestamp && (
                    <span className="text-[11px] text-muted-foreground/70">
                      Updated {new Date(item.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Actions Feed
            </CardTitle>
            <CardDescription>
              Prioritised alerts across tasks, goals, reminders, scheduling, and spend signals.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {schedulingFallback && (
              <Badge variant="outline" className="text-xs">
                Preview scheduling data
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export default AIActionsFeed;
