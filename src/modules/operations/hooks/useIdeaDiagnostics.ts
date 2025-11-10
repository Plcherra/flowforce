import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdeaKpiInsight, DateRange } from './useIdeaInsights';
import { useProfile } from '@/hooks/useProfile';
import { runIdeaDiagnostics } from '../data/ideaRepository';

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
  const { profile } = useProfile();
  const actorUserId = profile?.userId ?? profile?.id ?? null;
  const queryClient = useQueryClient();

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

  const metricsFingerprint = useMemo(() => JSON.stringify(metricsPayload), [metricsPayload]);
  const queryKey = useMemo(
    () => [
      'idea-diagnostics',
      companyId,
      actorUserId,
      range.start.toISOString(),
      range.end.toISOString(),
      metricsFingerprint,
    ],
    [actorUserId, companyId, metricsFingerprint, range.end, range.start],
  );

  const query = useQuery<IdeaDiagnosticsResult>({
    queryKey,
    enabled: Boolean(companyId && actorUserId && metricsPayload.length > 0),
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Missing company context');
      }
      if (!actorUserId) {
        throw new Error('Missing actor context');
      }
      if (metricsPayload.length === 0) {
        return { causes: [], recommendations: [] };
      }

      const diagnostics = await runIdeaDiagnostics({
        endpoint: '/functions/v1/copilot-service',
        companyId,
        actorUserId,
        timeframe: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          label: 'idea_cycle',
        },
        metrics: metricsPayload,
        signals: signalsPayload,
      });

      const causes = (diagnostics.insights ?? diagnostics.legacyCauses ?? []).map((insight, index) => ({
        id: insight.id ?? insight.metric ?? `cause-${index}`,
        summary: insight.message ?? insight.metric ?? (insight as any)?.summary ?? 'Operational insight',
        confidence:
          typeof insight?.metadata?.confidence === 'number'
            ? (insight.metadata.confidence as number)
            : severityConfidence[
                (insight.severity as keyof typeof severityConfidence) ?? ('info' as const)
              ] ?? 0.5,
      }));

      const recommendationsSource = diagnostics.recommendedActions ?? diagnostics.legacyRecommendations ?? [];
      const recommendations = recommendationsSource.map((item, index) => {
        const impactSummary =
          Array.isArray(item?.impacts) && item.impacts.length > 0
            ? item.impacts
                .map((impact: any) => `${impact.metric ?? 'Metric'} ${impact.delta ?? 0}${impact.unit ?? ''}`)
                .join('; ')
            : item?.evaluation?.reason ?? item?.notes?.join(' ') ?? item?.impact ?? 'Impact pending validation.';

        return {
          id: item?.dedupeKey ?? item?.id ?? `recommendation-${index}`,
          action: item?.actionType ?? item?.metadata?.title ?? item?.action ?? 'Suggested action',
          impact: impactSummary,
          confidence: typeof item?.confidence === 'number' ? item.confidence : 0.5,
        };
      });

      return { causes, recommendations };
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const fallback: IdeaDiagnosticsResult = { causes: [], recommendations: [] };

  return {
    ...(query.data ?? fallback),
    data: query.data ?? fallback,
    loading: query.isPending,
    error: (query.error as Error) ?? null,
    refresh,
  };
}
