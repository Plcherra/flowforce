import type { IdeaKpiInsight } from "@/modules/operations/hooks/useIdeaInsights";
import type { DateRange } from "@/modules/operations/hooks/useIdeaInsights";

export type MetricsPayload = Array<{
  metric: string | undefined;
  value: number;
  change: number;
  trend: string;
  unit?: string;
  observedAt: string;
  metadata?: Record<string, unknown>;
}>;

export const severityConfidence: Record<string, number> = {
  critical: 0.9,
  warning: 0.65,
  info: 0.45,
};

export function resolveSeverity(delta: number) {
  const absolute = Math.abs(delta);
  if (absolute >= 10) return "critical";
  if (absolute >= 5) return "warning";
  return "info";
}

export function buildMetricsPayload(
  insights: IdeaKpiInsight[],
  observedAtISO: string,
): MetricsPayload {
  return insights.map((insight) => ({
    metric: insight.label ?? insight.id,
    value: insight.value,
    change: insight.delta ?? 0,
    trend: insight.trend ?? "flat",
    unit: insight.unit ?? undefined,
    observedAt: observedAtISO,
    metadata: {
      id: insight.id,
    },
  }));
}

export function buildSignalsFromMetrics(metrics: MetricsPayload) {
  return metrics
    .filter((metric) => Math.abs(metric.change ?? 0) > 0)
    .map((metric) => {
      const severity = resolveSeverity(metric.change ?? 0);
      return {
        type: "kpi",
        severity,
        message:
          metric.change && metric.change < 0
            ? `${metric.metric} decreased by ${Math.abs(metric.change).toFixed(1)}${metric.unit ?? ""}`
            : `${metric.metric} increased by ${Math.abs(metric.change ?? 0).toFixed(1)}${metric.unit ?? ""}`,
        metric: metric.metric,
        observedAt: metric.observedAt,
        metadata: {
          delta: metric.change ?? 0,
          unit: metric.unit,
          value: metric.value,
          confidence: severityConfidence[severity],
        },
      };
    });
}

export function buildRangeWindows(range: DateRange) {
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();
  const durationMs = Math.max(range.end.getTime() - range.start.getTime(), 1);
  const previousEnd = new Date(range.start.getTime());
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    normalizedRange: { start: startISO, end: endISO },
    previousRange: {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
    },
  };
}
