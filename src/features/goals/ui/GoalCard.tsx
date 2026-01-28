import { format } from "date-fns";
import { CalendarDays, PencilLine, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Goal, GoalStatus } from "@/hooks/useGoals";
import { parseRewardDetails } from "@/features/goals/utils/rewardUtils";

const STATUS_STYLES: Record<GoalStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

export function computeGoalProgress(goal: Goal) {
  const tasks = goal.tasks ?? [];
  if (tasks.length === 0) {
    return goal.progress ?? 0;
  }

  const totalWeight = tasks.reduce((sum, taskLink) => {
    const weight = typeof taskLink.weight === "number" ? taskLink.weight : 1;
    return sum + weight;
  }, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const completedWeight = tasks.reduce((sum, taskLink) => {
    const weight = typeof taskLink.weight === "number" ? taskLink.weight : 1;
    const status = taskLink.task?.status?.toLowerCase() ?? "";
    const finished = status === "completed" || status === "done";
    return sum + (finished ? weight : 0);
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
}

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const rewardDetails = parseRewardDetails(goal.reward_details);
  const xpReward = rewardDetails.xp ?? goal.xpSummary.totalXp ?? 0;
  const xpLabel = xpReward ? `${xpReward} XP reward` : "No XP reward set";
  const progress = computeGoalProgress(goal);
  const tasks = goal.tasks ?? [];
  const displayTitle = goal.title?.trim() || "Untitled goal";
  const description = goal.description?.trim() ?? "";
  const taskSummary = tasks.reduce(
    (acc, link) => {
      const status = link.task?.status?.toLowerCase() ?? "";
      if (status === "completed" || status === "done") {
        acc.completed += 1;
      }
      return acc;
    },
    { completed: 0 },
  );

  const statusLabel =
    goal.status.charAt(0).toUpperCase() + goal.status.slice(1);

  return (
    <Card className="flex flex-col border-border/60 bg-background/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Badge className={STATUS_STYLES[goal.status]}>{statusLabel}</Badge>
          {goal.target_completion_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Due{" "}
                {format(new Date(goal.target_completion_date), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>
        <CardTitle className="text-xl font-semibold text-foreground">
          {displayTitle}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progress</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {tasks.length > 0
              ? `${taskSummary.completed}/${tasks.length} tasks completed`
              : "No tasks linked yet"}
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">{xpLabel}</p>
          {goal.rewardSummary && (
            <p className="text-xs text-muted-foreground">
              {goal.rewardSummary}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(goal)}
          className="gap-2"
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2 text-destructive"
          onClick={() => onDelete(goal)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
