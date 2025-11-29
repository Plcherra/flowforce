// @ts-nocheck
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdeaKpiInsight, DateRange } from './useIdeaInsights';
import { useProfile } from '@/hooks/useProfile';
import { runIdeaDiagnostics, type CopilotInsight, type CopilotRecommendation } from '../data/ideaRepository';
import {
  buildMetricsPayload,
  buildSignalsFromMetrics,
  severityConfidence,
} from '@/features/operations/utils/ideaMetrics';

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

export function useIdeaDiagnostics(
  companyId: string | undefined,
  insights: IdeaKpiInsight[],
  range: DateRange,
): IdeaDiagnosticsState {
  const { profile } = useProfile();
  const actorUserId = profile?.userId ?? profile?.id ?? null;
  const queryClient = useQueryClient();

  const metricsPayload = useMemo(() => {
    return buildMetricsPayload(insights, range.end.toISOString());
  }, [insights, range.end]);

  const signalsPayload = useMemo(() => buildSignalsFromMetrics(metricsPayload), [metricsPayload]);

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

      const causes = mapDiagnosticsCauses(diagnostics.insights ?? diagnostics.legacyCauses ?? []);
      const recommendations = mapDiagnosticsRecommendations(
        diagnostics.recommendedActions ?? diagnostics.legacyRecommendations ?? [],
      );

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

function mapDiagnosticsCauses(source: CopilotInsight[]): IdeaDiagnosticsResult['causes'] {
  return source.map((insight, index) => ({
    id: insight.id ?? insight.metric ?? `cause-${index}`,
    summary: insight.message ?? insight.metric ?? insight.summary ?? 'Operational insight',
    confidence:
      typeof insight?.metadata?.confidence === 'number'
        ? (insight.metadata.confidence as number)
        : severityConfidence[insight.severity ?? 'info'] ?? 0.5,
  }));
}

function mapDiagnosticsRecommendations(source: CopilotRecommendation[]): IdeaDiagnosticsResult['recommendations'] {
  return source.map((item, index) => {
    const impactSummary = Array.isArray(item.impacts) && item.impacts.length > 0
      ? item.impacts
          .map((impact) => `${impact.metric ?? 'Metric'} ${impact.delta ?? 0}${impact.unit ?? ''}`)
          .join('; ')
      : item.evaluation?.reason ?? item.notes?.join(' ') ?? item.impact ?? 'Impact pending validation.';

    const metadataTitle = getMetadataTitle(item.metadata);

    return {
      id: item.dedupeKey ?? item.id ?? `recommendation-${index}`,
      action: item.actionType ?? metadataTitle ?? item.action ?? 'Suggested action',
      impact: impactSummary,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    };
  });
}

function getMetadataTitle(metadata: CopilotRecommendation['metadata']) {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  if ('title' in metadata && typeof metadata.title === 'string') {
    return metadata.title;
  }
  return undefined;
}
