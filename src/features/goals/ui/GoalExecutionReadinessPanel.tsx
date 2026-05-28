import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Link2, Target } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Goal } from "@/hooks/useGoals";
import { buildGoalExecutionSummary } from "@/features/goals/utils/goalExecutionReadiness";

interface GoalExecutionReadinessPanelProps {
  goals: Goal[];
  onCreateGoal: () => void;
  onSuggestGoal: () => void;
  suggesting: boolean;
  canSuggest: boolean;
}

const reviewTone: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
};

export function GoalExecutionReadinessPanel({
  goals,
  onCreateGoal,
  onSuggestGoal,
  suggesting,
  canSuggest,
}: GoalExecutionReadinessPanelProps) {
  const summary = useMemo(
    () => buildGoalExecutionSummary({ goals }),
    [goals],
  );

  const cards = [
    {
      label: "Active goals",
      value: summary.activeGoals,
      detail: `${summary.dueThisWeekGoals} due this week`,
      icon: Target,
    },
    {
      label: "Needs review",
      value: summary.overdueGoals + summary.goalsWithoutTasks,
      detail: `${summary.overdueGoals} overdue`,
      icon: AlertTriangle,
    },
    {
      label: "Linked tasks",
      value: summary.linkedTasks,
      detail: `${summary.goalsWithoutTasks} goals without tasks`,
      icon: Link2,
    },
    {
      label: "Avg progress",
      value: `${summary.weightedTaskProgress}%`,
      detail: `${summary.completedGoals} completed`,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Goal Execution Readiness</CardTitle>
            <p className="text-sm text-muted-foreground">
              Goal progress is driven by linked task completion and target dates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSuggestGoal}
              disabled={!canSuggest || suggesting}
            >
              {suggesting ? "Suggesting..." : "Suggest Goal"}
            </Button>
            <Button type="button" onClick={onCreateGoal}>
              Create Goal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Goal review needed</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border px-3 py-2 text-sm ${reviewTone[item.severity]}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            Active goals have task coverage and no immediate target-date issues.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
