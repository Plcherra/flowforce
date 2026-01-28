/**
 * Goals tile detail panel component
 */

import { Progress } from "@/components/ui/progress";
import type { GoalsMetrics } from "../../types/kpi";
import { MetricBlock } from "./MetricBlock";
import { CopilotRecommendation } from "./CopilotRecommendation";

interface GoalsTileDetailProps {
  metrics: GoalsMetrics;
  copilotMessage: string;
  onAutomation: () => void;
  onCreateGoal: () => void;
  onNavigateToGoals: () => void;
}

export function GoalsTileDetail({
  metrics,
  copilotMessage,
  onAutomation,
  onCreateGoal,
  onNavigateToGoals,
}: GoalsTileDetailProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label="Active" value={metrics.active} />
        <MetricBlock
          label="Completed"
          value={metrics.completed}
          tone="success"
        />
        <MetricBlock
          label="Draft"
          value={metrics.draft}
          tone={metrics.draft > 0 ? "warning" : "default"}
        />
        <MetricBlock
          label="Average progress"
          value={`${metrics.averageProgress}%`}
          tone={metrics.averageProgress >= 70 ? "success" : "default"}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Momentum check
        </h3>
        <div className="mt-3 space-y-3">
          {metrics.topActive.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active goals detected. Co-Pilot can seed a goal framework with
              linked tasks in a few seconds.
            </p>
          ) : (
            metrics.topActive.map((goal, index) => (
              <div
                key={goal.id ?? `goal-${index}`}
                className="rounded-lg border border-border/70 bg-muted/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {goal.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {goal.progress ?? 0}%
                  </span>
                </div>
                <Progress className="mt-3 h-2" value={goal.progress ?? 0} />
              </div>
            ))
          )}
        </div>
      </div>

      <CopilotRecommendation
        message={copilotMessage}
        actions={[
          { label: "Refresh OKRs", onClick: onAutomation },
          {
            label: "Launch new goal",
            onClick: onCreateGoal,
            variant: "outline",
          },
          {
            label: "View goal workspace",
            onClick: onNavigateToGoals,
            variant: "ghost",
          },
        ]}
      />
    </div>
  );
}
