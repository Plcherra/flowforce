import { useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Link2,
  Repeat,
  UserRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { useReminders } from "@/features/tasks/hooks/useReminders";
import { buildTaskExecutionSummary } from "@/features/tasks/utils/taskExecutionReadiness";

interface TaskExecutionReadinessPanelProps {
  tasks: TaskWithRelations[];
  onCreateTask: () => void;
  onOpenTask: (taskId: string) => void;
}

const issueTone: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
};

export function TaskExecutionReadinessPanel({
  tasks,
  onCreateTask,
  onOpenTask,
}: TaskExecutionReadinessPanelProps) {
  const { reminders, loading: remindersLoading } = useReminders();
  const summary = useMemo(
    () => buildTaskExecutionSummary({ tasks, reminders }),
    [reminders, tasks],
  );

  const cards = [
    {
      label: "Active work",
      value: summary.activeTasks,
      detail: `${summary.dueTodayTasks} due today`,
      icon: CheckCircle2,
    },
    {
      label: "Blocked / overdue",
      value: summary.blockedTasks + summary.overdueTasks,
      detail: `${summary.overdueTasks} overdue`,
      icon: AlertTriangle,
    },
    {
      label: "Unassigned",
      value: summary.unassignedTasks,
      detail: "Needs owner",
      icon: UserRound,
    },
    {
      label: "Connected",
      value: summary.connectedTasks,
      detail: `${summary.unlinkedTasks} standalone`,
      icon: Link2,
    },
    {
      label: "Reminders",
      value: summary.taskReminders,
      detail: remindersLoading
        ? "Loading"
        : `${summary.recurringReminders} recurring`,
      icon: Bell,
    },
    {
      label: "Completion",
      value: `${summary.completionRate}%`,
      detail: `${summary.totalTasks} total`,
      icon: Repeat,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Execution Readiness</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tasks, goals, reminders, and ownership in one operating view.
            </p>
          </div>
          <Button type="button" onClick={onCreateTask}>
            New Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        {summary.issues.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Manager review needed</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.issues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    className={`rounded-md border px-3 py-2 text-left text-sm transition hover:opacity-90 ${issueTone[issue.severity]}`}
                    onClick={() => issue.taskId && onOpenTask(issue.taskId)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{issue.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {issue.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate">{issue.detail}</span>
                  </button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            No immediate task execution blockers detected.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
