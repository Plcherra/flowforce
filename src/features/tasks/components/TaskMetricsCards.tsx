/**
 * Task metrics cards component
 */

import { Card, CardContent } from "@/components/ui/card";
import type { TaskMetric } from "../types/filters";

interface TaskMetricsCardsProps {
  metrics: TaskMetric[];
}

export function TaskMetricsCards({ metrics }: TaskMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={
            metric.tone === "alert"
              ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10"
              : "border-border"
          }
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metric.helper}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
