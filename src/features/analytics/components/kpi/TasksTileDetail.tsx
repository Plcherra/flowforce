/**
 * Tasks tile detail panel component
 */

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { TasksMetrics } from "../../types/kpi";
import { MetricBlock } from "./MetricBlock";
import { CopilotRecommendation } from "./CopilotRecommendation";

interface TasksTileDetailProps {
  metrics: TasksMetrics;
  copilotMessage: string;
  onAutomation: () => void;
  onCreateTask: () => void;
  onNavigateToTasks: () => void;
}

export function TasksTileDetail({
  metrics,
  copilotMessage,
  onAutomation,
  onCreateTask,
  onNavigateToTasks,
}: TasksTileDetailProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label="Open queue" value={metrics.open} />
        <MetricBlock
          label="Completion rate"
          value={`${metrics.completionRate}%`}
          tone={metrics.completionRate >= 70 ? "success" : "default"}
        />
        <MetricBlock
          label="Due soon (≤3d)"
          value={metrics.dueSoon}
          tone={metrics.dueSoon > 0 ? "warning" : "default"}
        />
        <MetricBlock
          label="High priority"
          value={metrics.highPriority}
          tone={metrics.highPriority > 0 ? "warning" : "default"}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Overdue spotlight
        </h3>
        <div className="mt-3 space-y-3">
          {metrics.overdueList.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No overdue tasks at the moment. Co-Pilot recommends capturing
              process improvements while the board is clear.
            </p>
          ) : (
            metrics.overdueList.map((task, index) => (
              <div
                key={task.id ?? `task-${index}`}
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {task.title}
                  </span>
                  {task.due_date && (
                    <Badge
                      variant="destructive"
                      className="text-[11px] uppercase"
                    >
                      Due {format(new Date(task.due_date), "MMM d")}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CopilotRecommendation
        message={copilotMessage}
        actions={[
          { label: "Deploy automation", onClick: onAutomation },
          {
            label: "Create improvement task",
            onClick: onCreateTask,
            variant: "outline",
          },
          {
            label: "Open task workspace",
            onClick: onNavigateToTasks,
            variant: "ghost",
          },
        ]}
      />
    </div>
  );
}
