import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label={t("analytics.openQueue")} value={metrics.open} />
        <MetricBlock
          label={t("inventory.completionRate")}
          value={`${metrics.completionRate}%`}
          tone={metrics.completionRate >= 70 ? "success" : "default"}
        />
        <MetricBlock
          label={t("analytics.dueSoon3d")}
          value={metrics.dueSoon}
          tone={metrics.dueSoon > 0 ? "warning" : "default"}
        />
        <MetricBlock
          label={t("analytics.highPriority")}
          value={metrics.highPriority}
          tone={metrics.highPriority > 0 ? "warning" : "default"}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("analytics.overdueSpotlight")}
        </h3>
        <div className="mt-3 space-y-3">
          {metrics.overdueList.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("analytics.noOverdueTasksAtTheMomentCoPilotRecommendsCapturingProcessImprovementsWhileTheBoardIsClear")}
            </p>
          ) : (
            metrics.overdueList.map((task, index) => {
              return (
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
                      {t("inventory.due")} {format(new Date(task.due_date), "MMM d")}
                    </Badge>
                  )}
                </div>
              </div>
            );
            })
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
