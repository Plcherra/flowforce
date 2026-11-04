/**
 * Task card component
 */

import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar, User, Flag, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTaskStatusBadgeClass } from "@/constants/taskStatus";
import { useFormContentDisplay } from "@/features/forms/components/FormContentText";
import type { TaskWithRelations } from "@/hooks/useTasks";
import type { TaskContentTranslation } from "../taskContentFields";
import type { DueBadge } from "../types/filters";
import { getPriorityColor } from "../utils/priorityHelpers";
import { Button } from "@/components/ui/button";
import { readScheduleTaskLink } from "../utils/scheduleTaskLink";
import { readAssigneeIds, readFormId } from "../utils/shiftTaskWrite";
import { readTaskKind } from "../utils/taskKind";
import {
  translatedKindLabel,
  translatedPriorityLabel,
  translatedPublishLabel,
  translatedStatusLabel,
} from "../utils/taskCopy";
import {
  formatTaskWindow,
  readTaskPoints,
  readTaskSchedule,
} from "../utils/taskSchedule";
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

interface TaskCardProps {
  task: TaskWithRelations;
  dueBadge: DueBadge | null;
  highlighted: boolean;
  selectionHandlers: SelectionHandlers;
  translation?: TaskContentTranslation | null;
  onFillForm?: (formId: string) => void;
}

export function TaskCard({
  task,
  dueBadge,
  highlighted,
  selectionHandlers,
  translation = null,
  onFillForm,
}: TaskCardProps) {
  const { t } = useTranslation();
  const display = useFormContentDisplay({
    recordId: task.id,
    title: task.title,
    description: task.description,
    translation,
  });
  const scheduleLink = readScheduleTaskLink(task);
  const kindLabel = translatedKindLabel(t, readTaskKind(task));
  const formId = readFormId(task.links);
  const schedule = readTaskSchedule(task.links);
  const windowLabel = formatTaskWindow(schedule.startsAt, schedule.endsAt);
  const publishLabel = translatedPublishLabel(t, schedule.publishState);
  const points = readTaskPoints(task.links);
  const assigneeCount = readAssigneeIds(task.links, task.assigned_to).length;

  return (
    <Card
      key={task.id}
      id={`task-card-${task.id}`}
      data-testid={`task-card-${task.id}`}
      data-highlighted={highlighted}
      role="button"
      tabIndex={0}
      aria-label={t("tasks.openTask", { title: display.title })}
      onClick={selectionHandlers.onClick}
      onKeyDown={selectionHandlers.onKeyDown}
      className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        highlighted ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{display.title}</CardTitle>
            {display.description ? (
              <CardDescription className="line-clamp-2">
                {display.description}
              </CardDescription>
            ) : null}
            {display.control ? (
              <button
                type="button"
                className="text-left text-xs text-muted-foreground underline"
                onClick={(event) => {
                  event.stopPropagation();
                  display.toggle();
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {display.control}
              </button>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(task.priority)}`}
              />
              <Badge className={getTaskStatusBadgeClass(task.status)}>
                {translatedStatusLabel(t, task.status ?? "", task.status ?? "")}
              </Badge>
              <Badge variant="outline" data-testid="task-kind-badge">
                {kindLabel}
              </Badge>
              {publishLabel ? (
                <Badge variant="outline" data-testid="task-publish-badge">
                  {publishLabel}
                </Badge>
              ) : null}
            </div>
            {dueBadge && (
              <Badge
                variant="outline"
                className={`text-xs ${dueBadge.className}`}
              >
                {dueBadgeText(t, dueBadge.label)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            {task.assignedprofile && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>
                  {task.assignedprofile.first_name}{" "}
                  {task.assignedprofile.last_name}
                  {assigneeCount > 1
                    ? ` · ${t("people.selectedCount", { count: assigneeCount })}`
                    : ""}
                </span>
              </div>
            )}
            {points != null ? (
              <div className="flex items-center gap-1" data-testid="task-points">
                <span>{t("tasks.pointsCount", { count: points })}</span>
              </div>
            ) : null}
            {windowLabel ? (
              <div className="flex items-center gap-1" data-testid="task-window">
                <Calendar className="h-4 w-4" />
                <span>{windowLabel}</span>
              </div>
            ) : null}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(task.due_date), "MMM dd, yyyy")}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4" />
              <span className="capitalize">
                {task.priority
                  ? translatedPriorityLabel(t, task.priority, task.priority)
                  : t("tasks.notSet")}
              </span>
            </div>
            {scheduleLink ? (
              <div className="flex items-center gap-1">
                <span>{scheduleLink.shiftTitle}</span>
              </div>
            ) : null}
            {task.goal && (
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="max-w-[160px] truncate">
                  {task.goal.title}
                </span>
                <Badge variant="outline" className="ml-1 px-1.5 text-[10px]">
                  {task.goal.progress ?? 0}%
                </Badge>
              </div>
            )}
          </div>
          <div className="text-xs">
            {t("tasks.createdOn", {
              date: format(new Date(task.created_at), "MMM dd, yyyy"),
            })}
          </div>
        </div>
        {formId ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 w-full sm:w-auto"
            data-testid={`task-fill-${task.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onFillForm?.(formId);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {t("tasks.fillAndSend")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
