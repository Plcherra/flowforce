import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TFunction } from "i18next";
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Flag,
  MessageSquare,
  Plus,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useTaskTimeline, type TaskActivity } from "@/features/tasks/hooks";
import { TimelineSkeleton } from "@/components/loading/TaskSkeletons";
import {
  translatedPriorityLabel,
  translatedStatusLabel,
} from "../utils/taskCopy";

interface TaskTimelineProps {
  taskId: string | null;
  open: boolean;
}

const activityIconMap: Record<string, JSX.Element> = {
  task_created: <Plus className="h-4 w-4 text-primary" />,
  task_assigned: <User className="h-4 w-4 text-success" />,
  task_status_changed: <Flag className="h-4 w-4 text-secondary" />,
  task_completed: <CheckCircle className="h-4 w-4 text-success" />,
  task_commented: <MessageSquare className="h-4 w-4 text-primary" />,
  task_updated: <Edit className="h-4 w-4 text-warning" />,
  task_due_changed: <Calendar className="h-4 w-4 text-destructive" />,
};

const getActivityIcon = (activityType: string) => {
  return (
    activityIconMap[activityType] ?? <Clock className="h-4 w-4 text-muted-foreground" />
  );
};

function formatMetadata(t: TFunction, activity: TaskActivity): string | null {
  const metadata = (activity.metadata ?? {}) as Record<string, unknown>;

  if (activity.action_type === "task_status_changed") {
    return t("tasks.timelineStatusChanged", {
      from: translatedStatusLabel(t, String(metadata.old_status ?? "")),
      to: translatedStatusLabel(t, String(metadata.new_status ?? "")),
    });
  }

  if (activity.action_type === "task_due_changed") {
    const oldDue = metadata.old_due_date
      ? format(new Date(metadata.old_due_date as string), "PPP")
      : t("tasks.timelineNone");
    const newDue = metadata.new_due_date
      ? format(new Date(metadata.new_due_date as string), "PPP")
      : t("tasks.timelineNone");
    return t("tasks.timelineDueChanged", { from: oldDue, to: newDue });
  }

  if (activity.action_type === "task_assigned") {
    if (metadata.new_assignee && !metadata.old_assignee) {
      return t("tasks.timelineAssigned");
    }
    if (!metadata.new_assignee && metadata.old_assignee) {
      return t("tasks.timelineUnassigned");
    }
    return t("tasks.timelineReassigned");
  }

  if (activity.action_type === "task_completed") {
    return metadata.completed_at
      ? t("tasks.timelineCompletedWhen", {
          when: formatDistanceToNow(new Date(metadata.completed_at as string), {
            addSuffix: true,
          }),
        })
      : t("tasks.timelineMarkedDone");
  }

  if (activity.action_type === "task_created") {
    const priority = String(metadata.priority ?? "medium");
    return t("tasks.timelinePrioritySet", {
      priority: translatedPriorityLabel(t, priority, priority),
    });
  }

  return null;
}

export function TaskTimeline({ taskId, open }: TaskTimelineProps) {
  const { t } = useTranslation();
  const { activities, loading } = useTaskTimeline(taskId, open);
  const hasTimeline = activities.length > 0;

  const timelineItems = useMemo(() => {
    return activities.map((activity) => ({
      id: activity.id,
      icon: getActivityIcon(activity.action_type),
      description: activity.description,
      createdAt: activity.created_at,
      metadata: formatMetadata(t, activity),
    }));
  }, [activities, t]);

  if (!taskId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("tasks.timeline")}</h3>
        {hasTimeline && (
          <Badge variant="secondary">
            {t("tasks.timelineEvents", { count: activities.length })}
          </Badge>
        )}
      </div>
      <div className="border rounded-md bg-muted/40">
        <ScrollArea className="max-h-72">
          {loading ? (
            <TimelineSkeleton />
          ) : !hasTimeline ? (
            <div className="py-6 px-4 text-sm text-muted-foreground">
              {t("tasks.activityWillAppearHereAsYouWorkOn2")}
            </div>
          ) : (
            <ol className="relative border-l border-border/70 px-4 py-4 space-y-6">
              {timelineItems.map((item) => (
                <li key={item.id} className="ml-4">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
                    {item.icon}
                  </span>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {item.description}
                  </p>
                  {item.metadata && (
                    <p className="mt-1 text-xs text-muted-foreground/90">
                      {item.metadata}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
