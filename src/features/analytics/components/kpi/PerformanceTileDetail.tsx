/**
 * Performance tile detail panel component
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PerformanceMetrics } from "../../types/kpi";
import { MetricBlock } from "./MetricBlock";
import { CopilotRecommendation } from "./CopilotRecommendation";

interface PerformanceTileDetailProps {
  metrics: PerformanceMetrics;
  copilotMessage: string;
  onAutomation: () => void;
  onNavigateToPerformance: () => void;
  onNavigateToRecognition: () => void;
}

export function PerformanceTileDetail({
  metrics,
  copilotMessage,
  onAutomation,
  onNavigateToPerformance,
  onNavigateToRecognition,
}: PerformanceTileDetailProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock
          label="Average completion"
          value={
            metrics.averageCompletionRate > 0
              ? `${metrics.averageCompletionRate}%`
              : "—"
          }
        />
        <MetricBlock
          label="Top performer"
          value={
            metrics.topPerformer
              ? `${metrics.topPerformer.first_name ?? ""} ${metrics.topPerformer.last_name ?? ""}`.trim() ||
                "Team lead"
              : "n/a"
          }
        />
        <MetricBlock
          label="Contributors tracked"
          value={metrics.topContributors.length}
          tone={metrics.topContributors.length > 0 ? "success" : "default"}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Standout performers
        </h3>
        <div className="mt-3 space-y-3">
          {metrics.topContributors.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Co-Pilot needs fresh performance data to highlight coaching
              moments. Sync your latest reviews to continue.
            </p>
          ) : (
            metrics.topContributors.map((entry, index) => (
              <div
                key={`${entry.first_name ?? ""}-${entry.last_name ?? ""}-${index}`}
                className="rounded-lg border border-border/70 bg-muted/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {`${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim() ||
                        `Teammate ${index + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(entry.tasks ?? 0) > 0
                        ? `${entry.tasks} tasks owned`
                        : "Task load syncing"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[11px]">
                    {Math.round(entry.completion_rate ?? 0)}%
                  </Badge>
                </div>
                <Progress
                  className="mt-3 h-2"
                  value={entry.completion_rate ?? 0}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <CopilotRecommendation
        message={copilotMessage}
        actions={[
          { label: "Build coaching brief", onClick: onAutomation },
          {
            label: "Open performance centre",
            onClick: onNavigateToPerformance,
            variant: "outline",
          },
          {
            label: "Send recognition",
            onClick: onNavigateToRecognition,
            variant: "ghost",
          },
        ]}
      />
    </div>
  );
}
