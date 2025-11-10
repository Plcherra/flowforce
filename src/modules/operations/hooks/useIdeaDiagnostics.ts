import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IdeaKpiInsight, DateRange } from './useIdeaInsights';
import { useProfile } from '@/hooks/useProfile';

interface IdeaDiagnosticsResult {
  causes: Array<{ id: string; summary: string; confidence: number }>;
  recommendations: Array<{ id: string; action: string; impact: string; confidence: number }>;
}

interface IdeaDiagnosticsState extends IdeaDiagnosticsResult {
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  data: IdeaDiagnosticsResult;
}

const severityConfidence: Record<string, number> = {
  critical: 0.9,
  warning: 0.65,
  info: 0.45,
};

const resolveSeverity = (delta: number) => {
  const absolute = Math.abs(delta);
  if (absolute >= 10) return 'critical';
  if (absolute >= 5) return 'warning';
  return 'info';
};

export function useIdeaDiagnostics(
  companyId: string | undefined,
  insights: IdeaKpiInsight[],
  range: DateRange,
): IdeaDiagnosticsState {
  const [result, setResult] = useState<IdeaDiagnosticsResult>({
    causes: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const { profile } = useProfile();

  const actorUserId = profile?.userId ?? profile?.id ?? null;

  const metricsPayload = useMemo(() => {
    const observedAt = range.end.toISOString();
    return insights.map((insight) => ({
      metric: insight.label ?? insight.id,
      value: insight.value,
      change: insight.delta ?? 0,
      trend: insight.trend ?? 'flat',
      unit: insight.unit ?? undefined,
      observedAt,
      metadata: {
        id: insight.id,
      },
    }));
  }, [insights, range.end]);

  const signalsPayload = useMemo(() => {
    return metricsPayload
      .filter((metric) => Math.abs(metric.change ?? 0) > 0)
      .map((metric) => {
        const severity = resolveSeverity(metric.change ?? 0);
        return {
          type: 'kpi',
          severity,
          message:
            metric.change && metric.change < 0
              ? `${metric.metric} decreased by ${Math.abs(metric.change).toFixed(1)}${metric.unit ?? ''}`
              : `${metric.metric} increased by ${Math.abs(metric.change ?? 0).toFixed(1)}${metric.unit ?? ''}`,
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
  }, [metricsPayload]);

  const runDiagnostics = useCallback(async () => {
    if (!companyId) {
      setError(new Error('Missing company context'));
      setResult({ causes: [], recommendations: [] });
      return;
    }

    if (!actorUserId) {
      setError(new Error('Missing actor context'));
      setResult({ causes: [], recommendations: [] });
      return;
    }

    if (metricsPayload.length === 0) {
      setResult({ causes: [], recommendations: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/functions/v1/copilot-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          actorUserId,
          source: 'system',
          mode: 'preview',
          timeframe: {
            start: range.start.toISOString(),
            end: range.end.toISOString(),
            label: 'idea_cycle',
          },
          metrics: metricsPayload,
          signals: signalsPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diagnostics request failed (${response.status})`);
      }

      const body = await response.json();
      const evaluation = body?.evaluation ?? {};
      const causes = Array.isArray(evaluation?.insights)
        ? evaluation.insights.map((insight: any, index: number) => ({
            id: insight.id ?? insight.metric ?? `cause-${index}`,
            summary: insight.message ?? insight.metric ?? 'Operational insight',
            confidence:
              typeof insight?.metadata?.confidence === 'number'
                ? insight.metadata.confidence
                : severityConfidence[insight.severity as keyof typeof severityConfidence] ?? 0.5,
          }))
        : [];

      const recommendations = Array.isArray(evaluation?.recommendedActions)
        ? evaluation.recommendedActions.map((item: any, index: number) => {
            const impactSummary = Array.isArray(item?.impacts) && item.impacts.length > 0
              ? item.impacts
                  .map(
                    (impact: any) =>
                      `${impact.metric ?? 'Metric'} ${impact.delta ?? 0}${impact.unit ?? ''}`,
                  )
                  .join('; ')
              : item?.evaluation?.reason ?? item?.notes?.join(' ') ?? 'Impact pending validation.';

            return {
              id: item?.dedupeKey ?? item?.id ?? `recommendation-${index}`,
              action: item?.actionType ?? item?.metadata?.title ?? 'Suggested action',
              impact: impactSummary,
              confidence: typeof item?.confidence === 'number' ? item.confidence : 0.5,
            };
          })
        : [];

      setResult({ causes, recommendations });
    } catch (caughtError) {
      setError(caughtError as Error);
      setResult({ causes: [], recommendations: [] });
    } finally {
      setLoading(false);
    }
  }, [actorUserId, companyId, metricsPayload, range.end, range.start, signalsPayload]);

  useEffect(() => {
    if (metricsPayload.length === 0) {
      setResult({ causes: [], recommendations: [] });
      return;
    }

    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runDiagnostics, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    ...result,
    data: result,
    loading,
    error,
    refresh,
  };
}
