/**
 * Task card component
 */

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
import {
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
} from "@/constants/taskStatus";
import type { TaskWithRelations } from "@/hooks/useTasks";
import type { DueBadge } from "../types/filters";
import { getPriorityColor } from "../utils/priorityHelpers";
import type { SelectionHandlers } from "../hooks/useTaskSelection";

interface TaskCardProps {
  task: TaskWithRelations;
  dueBadge: DueBadge | null;
  highlighted: boolean;
  selectionHandlers: SelectionHandlers;
}

export function TaskCard({
  task,
  dueBadge,
  highlighted,
  selectionHandlers,
}: TaskCardProps) {
  return (
    <Card
      key={task.id}
      id={`task-card-${task.id}`}
      data-testid={`task-card-${task.id}`}
      data-highlighted={highlighted}
      role="button"
      tabIndex={0}
      aria-label={`Open task ${task.title}`}
      onClick={selectionHandlers.onClick}
      onKeyDown={selectionHandlers.onKeyDown}
      className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        highlighted ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            {task.description && (
              <CardDescription className="line-clamp-2">
                {task.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(task.priority)}`}
              />
              <Badge className={getTaskStatusBadgeClass(task.status)}>
                {getTaskStatusLabel(task.status)}
              </Badge>
            </div>
            {dueBadge && (
              <Badge
                variant="outline"
                className={`text-xs ${dueBadge.className}`}
              >
                {dueBadge.label}
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
                </span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(task.due_date), "MMM dd, yyyy")}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4" />
              <span className="capitalize">{task.priority ?? "not set"}</span>
            </div>
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
            Created {format(new Date(task.created_at), "MMM dd, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
