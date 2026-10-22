import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { useReminders } from "@/features/tasks/hooks/useReminders";
import { buildTaskExecutionSummary } from "@/features/tasks/utils/taskExecutionReadiness";
import {
  READINESS_DEFINITIONS,
  readinessCounts,
  type ReadinessFilter,
} from "@/features/tasks/utils/readinessFilters";

interface TaskExecutionReadinessPanelProps {
  tasks: TaskWithRelations[];
  readinessFilter: ReadinessFilter | null;
  onReadinessFilterChange: (value: ReadinessFilter | null) => void;
  onOpenTask: (taskId: string) => void;
}

const issueTone: Record<string, string> = {
  critical:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
};

const readinessItems: Array<{ key: ReadinessFilter; label: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "unassigned", label: "Unassigned" },
  { key: "due", label: "Due" },
];

export function TaskExecutionReadinessPanel({
  tasks,
  readinessFilter,
  onReadinessFilterChange,
  onOpenTask,
}: TaskExecutionReadinessPanelProps) {
  const { reminders } = useReminders();
  const summary = useMemo(
    () => buildTaskExecutionSummary({ tasks, reminders }),
    [reminders, tasks],
  );
  const counts = useMemo(() => readinessCounts(tasks), [tasks]);

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-xl">Execution Readiness</CardTitle>
          <p className="text-sm text-muted-foreground">
            Counts follow the status tab. Press one to filter the list.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {readinessItems.map((item) => {
            const pressed = readinessFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={READINESS_DEFINITIONS[item.key]}
                aria-pressed={pressed}
                data-testid={`tasks-readiness-${item.key}`}
                className={`rounded-lg border p-3 text-left ${
                  pressed
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-muted/30"
                }`}
                onClick={() =>
                  onReadinessFilterChange(pressed ? null : item.key)
                }
              >
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {counts[item.key]}
                </p>
              </button>
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
