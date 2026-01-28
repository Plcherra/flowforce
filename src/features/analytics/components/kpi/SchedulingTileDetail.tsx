/**
 * Scheduling tile detail panel component
 */

import type { SchedulingMetrics } from "../../types/kpi";
import { MetricBlock } from "./MetricBlock";
import { CopilotRecommendation } from "./CopilotRecommendation";

interface SchedulingTileDetailProps {
  metrics: SchedulingMetrics;
  copilotMessage: string;
  onAutomation: () => void;
  onNavigateToScheduling: () => void;
  onNavigateToTimeOff: () => void;
}

export function SchedulingTileDetail({
  metrics,
  copilotMessage,
  onAutomation,
  onNavigateToScheduling,
  onNavigateToTimeOff,
}: SchedulingTileDetailProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock
          label="Coverage"
          value={metrics.coverage > 0 ? `${metrics.coverage}%` : "—"}
          tone={metrics.hasCapacityGap ? "warning" : "success"}
        />
        <MetricBlock
          label="Hours utilisation"
          value={
            metrics.hoursUtilization > 0 ? `${metrics.hoursUtilization}%` : "—"
          }
          tone={
            metrics.hoursUtilization > 110
              ? "warning"
              : metrics.hoursUtilization > 95
                ? "info"
                : "default"
          }
        />
        <MetricBlock
          label="Task completion"
          value={
            metrics.taskCompletion > 0 ? `${metrics.taskCompletion}%` : "—"
          }
          tone={metrics.tasksBehind ? "warning" : "success"}
        />
        <MetricBlock
          label="Pending PTO"
          value={metrics.pendingTimeOff}
          tone={metrics.pendingTimeOff > 4 ? "warning" : "default"}
        />
      </div>

      <CopilotRecommendation
        message={copilotMessage}
        actions={[
          { label: "Balance coverage", onClick: onAutomation },
          {
            label: "Open scheduling board",
            onClick: onNavigateToScheduling,
            variant: "outline",
          },
          {
            label: "Review time-off queue",
            onClick: onNavigateToTimeOff,
            variant: "ghost",
          },
        ]}
      />
    </div>
  );
}
