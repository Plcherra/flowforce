import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { useReminders } from "@/features/tasks/hooks/useReminders";
import { buildTaskExecutionSummary } from "@/features/tasks/utils/taskExecutionReadiness";
import { translatedWarningLabel } from "@/features/tasks/utils/taskCopy";

interface TaskExecutionReadinessPanelProps {
  tasks: TaskWithRelations[];
  onOpenTask: (taskId: string) => void;
}

export function TaskExecutionReadinessPanel({
  tasks,
  onOpenTask,
}: TaskExecutionReadinessPanelProps) {
  const { t } = useTranslation();
  const { reminders } = useReminders();
  const summary = useMemo(
    () => buildTaskExecutionSummary({ tasks, reminders }),
    [reminders, tasks],
  );

  if (summary.issues.length === 0) return null;

  return (
    <section aria-label={t("tasks.warnings")} data-testid="tasks-warnings" className="space-y-2">
      <h2 className="text-sm font-semibold">{t("tasks.warnings")}</h2>
      <ul className="divide-y overflow-hidden rounded-lg border border-border/70">
        {summary.issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
              onClick={() => issue.taskId && onOpenTask(issue.taskId)}
            >
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {translatedWarningLabel(t, issue.label)}
              </span>
              <span className="min-w-0 truncate">{issue.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
