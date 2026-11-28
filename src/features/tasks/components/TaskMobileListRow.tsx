import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskStatusBadgeClass } from "@/constants/taskStatus";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { formatTaskDueLabel } from "@/features/tasks/utils/formatTaskDue";
import {
  DEFAULT_SHOP_TIMEZONE,
  isTaskOverdue,
} from "@/features/tasks/utils/taskDueTiming";
import { isOpenTaskStatus } from "@/features/tasks/utils/simpleTaskWorkflow";
import { translatedStatusLabel } from "@/features/tasks/utils/taskCopy";
import type { DueBadge } from "../types/filters";
import type { SelectionHandlers } from "../hooks/useTaskSelection";
import type { TFunction } from "i18next";

function dueBadgeText(t: TFunction, label: string): string {
  if (label === "Completed") return t("tasks.statusDone");
  if (label === "Overdue") return t("tasks.overdue");
  if (label === "Due Soon") return t("tasks.dueSoon");
  if (label.startsWith("Due ")) {
    return t("tasks.dueOn", { date: label.slice(4) });
  }
  return label;
}

interface TaskMobileListRowProps {
  task: TaskWithRelations;
  dueBadge: DueBadge | null;
  highlighted: boolean;
  selectionHandlers: SelectionHandlers;
  timeZone?: string;
  onComplete?: (taskId: string) => void;
}

export function TaskMobileListRow({
  task,
  dueBadge,
  highlighted,
  selectionHandlers,
  timeZone = DEFAULT_SHOP_TIMEZONE,
  onComplete,
}: TaskMobileListRowProps) {
  const { t, i18n } = useTranslation();
  const language = appLanguageFromTag(i18n.language);
  const overdue = isTaskOverdue(task, timeZone);
  const assignee = task.assignedprofile
    ? `${task.assignedprofile.first_name ?? ""} ${task.assignedprofile.last_name ?? ""}`.trim()
    : t("tasks.unassigned");
  const dueLabel = formatTaskDueLabel(task, t, language, timeZone);

  return (
    <article
      id={`task-mobile-row-${task.id}`}
      data-testid={`task-mobile-row-${task.id}`}
      data-highlighted={highlighted}
      className={`space-y-2 rounded-xl border bg-card p-3 shadow-sm ${
        overdue
          ? "border-destructive/50 bg-destructive/5"
          : highlighted
            ? "ring-2 ring-primary"
            : "border-border"
      }`}
    >
      <button
        type="button"
        className="w-full space-y-2 text-left"
        onClick={selectionHandlers.onClick}
        onKeyDown={selectionHandlers.onKeyDown}
        aria-label={t("tasks.openTask", { title: task.title ?? "" })}
      >
        <p className="text-base font-semibold leading-snug">{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {dueLabel ? (
            <span
              className={overdue ? "font-medium text-destructive" : ""}
              data-testid="task-due-label"
            >
              {dueLabel}
            </span>
          ) : (
            <span>{t("tasks.notSet")}</span>
          )}
          {dueBadge && overdue ? (
            <Badge variant="destructive" className="text-xs" data-testid="task-due-badge">
              {dueBadgeText(t, dueBadge.label)}
            </Badge>
          ) : null}
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span data-testid="task-mobile-assignee">{assignee}</span>
          <Badge className={getTaskStatusBadgeClass(task.status)}>
            {translatedStatusLabel(t, task.status ?? "", task.status ?? "")}
          </Badge>
        </div>
      </button>
      {onComplete && isOpenTaskStatus(task.status) ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          data-testid={`task-complete-${task.id}`}
          onClick={() => onComplete(task.id)}
        >
          {t("tasks.markDone")}
        </Button>
      ) : null}
    </article>
  );
}