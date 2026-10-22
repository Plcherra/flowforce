import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock
          label={t("analytics.coverage2")}
          value={metrics.coverage > 0 ? `${metrics.coverage}%` : "—"}
          tone={metrics.hasCapacityGap ? "warning" : "success"}
        />
        <MetricBlock
          label={t("analytics.hoursUtilisation")}
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
          label={t("analytics.taskCompletion")}
          value={
            metrics.taskCompletion > 0 ? `${metrics.taskCompletion}%` : "—"
          }
          tone={metrics.tasksBehind ? "warning" : "success"}
        />
        <MetricBlock
          label={t("analytics.pendingPto")}
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
