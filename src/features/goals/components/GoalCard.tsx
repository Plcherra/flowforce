import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  CheckCircle2,
  Circle,
  Medal,
  PencilLine,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { Goal, GoalStatus } from "@/hooks/useGoals";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onToggleStatus: (goal: Goal, status: GoalStatus) => void;
  onDelete: (goal: Goal) => void;
}

const statusStyles: Record<GoalStatus, string> = {
  active: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export function GoalCard({
  goal,
  onEdit,
  onToggleStatus,
  onDelete,
}: GoalCardProps) {
  const ownerName = goal.owner
    ? [goal.owner.first_name, goal.owner.last_name].filter(Boolean).join(" ")
    : "Unassigned";

  const tasks = goal.tasks ?? [];
  const completedTasks = tasks.filter(
    (item) =>
      item.task?.status && item.task.status.toLowerCase() === "completed",
  ).length;
  const totalTasks = tasks.length;
  const xpSummary = goal.xpSummary ?? { totalXp: 0, rewardCount: 0 };
  const rewardSummary = goal.rewardSummary?.trim() ?? "";

  const ownerInitials =
    goal.owner && (goal.owner.first_name || goal.owner.last_name)
      ? `${goal.owner.first_name?.[0] ?? ""}${goal.owner.last_name?.[0] ?? ""}`
          .trim()
          .toUpperCase()
      : "NA";

  const isCompleted = goal.status === "completed";
  const isCancelled = goal.status === "cancelled";
  const nextStatus: GoalStatus =
    isCompleted || isCancelled ? "active" : "completed";
  const primaryActionLabel = isCancelled
    ? "Restore"
    : isCompleted
      ? "Mark Active"
      : "Mark Complete";

  return (
    <Card className="border border-border/60 bg-background/60 shadow-sm transition hover:shadow-lg">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge className={`${statusStyles[goal.status]} w-fit`}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </Badge>
            <CardTitle className="text-xl font-semibold text-foreground">
              {goal.title}
            </CardTitle>
          </div>
        </div>
        {goal.description && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
            {goal.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">
              {goal.progress ?? 0}%
            </span>
          </div>
          <Progress value={goal.progress ?? 0} className="h-2" />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Linked tasks</span>
              <span className="font-medium text-foreground">
                {completedTasks}/{totalTasks} completed
              </span>
            </div>
            {totalTasks > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tasks.slice(0, 3).map((taskLink) => {
                  const task = taskLink.task;
                  const done = task?.status?.toLowerCase() === "completed";
                  return (
                    <li key={taskLink.id} className="flex items-start gap-2">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/60" />
                      )}
                      <div className="flex-1">
                        <p className="line-clamp-1 font-medium text-foreground">
                          {task?.title ?? "Untitled task"}
                        </p>
                        <p className="text-xs">
                          {done ? "Completed" : (task?.status ?? "In progress")}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {tasks.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{tasks.length - 3} more linked task
                    {tasks.length - 3 === 1 ? "" : "s"}
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks linked yet. Associate tasks to track progress
                automatically.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Medal className="h-4 w-4 text-amber-500" />
                <span>Recognition XP</span>
              </div>
              <span className="font-semibold text-foreground">
                {xpSummary.totalXp}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {xpSummary.rewardCount > 0
                ? `${xpSummary.rewardCount} reward${xpSummary.rewardCount === 1 ? "" : "s"} linked to this goal`
                : "No recognitions earned yet"}
            </p>
            {rewardSummary && (
              <p className="mt-2 text-xs text-muted-foreground">
                {rewardSummary}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/50">
              {goal.owner?.avatar_url ? (
                <AvatarImage src={goal.owner.avatar_url} alt={ownerName} />
              ) : (
                <AvatarFallback>{ownerInitials}</AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Owner
              </span>
              <p className="font-medium text-foreground">{ownerName}</p>
            </div>
          </div>

          {goal.target_completion_date && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>
                Due{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(goal.target_completion_date), "MMM d, yyyy")}
                </span>
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 p-4">
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onToggleStatus(goal, nextStatus)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {primaryActionLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(goal)}>
            <PencilLine className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDelete(goal)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
