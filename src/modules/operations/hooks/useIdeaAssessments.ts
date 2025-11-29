// @ts-nocheck
import { useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_IDEA_KPI_SUMMARY } from '@/mock/kpi_insights';
import type { DateRange, IdeaKpiInsight } from './useIdeaInsights';
import { formatRangeAsPgDate } from '@/modules/operations/utils/dateRange';
import { buildRangeWindows } from '@/features/operations/utils/ideaMetrics';
import { parseIdeaKpiInsights, type IdeaKpiInsightRecord } from '../data/ideaRepository';

export interface IdeaAssessmentMetric {
  metric: string;
  before: number;
  after: number;
  delta: number;
  roi: number | null;
  unit?: string | null;
}

interface IdeaAssessmentState {
  data: IdeaAssessmentMetric[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  saveAssessment: (notes?: string) => Promise<void>;
}

async function fetchKpiSnapshot(companyId: string, range: { start: string; end: string }): Promise<IdeaKpiInsightRecord[]> {
  const { data, error } = await supabase.rpc('get_kpi_summary', {
    company_id: companyId,
    range_start: range.start,
    range_end: range.end,
  });

  if (error) {
    if (error.message?.includes('function public.get_kpi_summary')) {
      if (import.meta.env.DEV) {
        console.warn(
          '[useIdeaAssessments] RPC get_kpi_summary unavailable, returning mock IDEA KPI summary.',
          error.message,
        );
      }
      return MOCK_IDEA_KPI_SUMMARY.map((item) => ({
        id: item.id,
        label: item.label,
        metric: item.label,
        value: item.value,
        unit: item.unit,
        delta: item.delta,
        trend: item.trend,
      } satisfies IdeaKpiInsightRecord));
    }
    throw error;
  }

  return parseIdeaKpiInsights(data);
}

async function persistAssessment(options: {
  companyId: string;
  cycleId: string | null;
  metrics: IdeaAssessmentMetric[];
  latestInsights: IdeaKpiInsight[];
  rangeLabel: string;
  notes?: string;
}) {
  const assessmentsPayload = {
    metrics: options.metrics,
    notes: options.notes ?? null,
  };

  const targetMutation = options.cycleId
    ? supabase
        .from('idea_cycles')
        .update({
          stage: 'assess',
          assessments: assessmentsPayload,
        })
        .eq('id', options.cycleId)
        .select()
        .single()
    : supabase
        .from('idea_cycles')
        .insert({
          company_id: options.companyId,
          stage: 'assess',
          range: options.rangeLabel,
          insights: options.latestInsights,
          actions: null,
          assessments: assessmentsPayload,
        })
        .select()
        .single();

  const { error } = await targetMutation;

  if (error) {
    throw error;
  }
}

export function useIdeaAssessments(
  companyId: string | undefined,
  range: DateRange,
  cycleId: string | null,
  latestInsights: IdeaKpiInsight[],
  enabled: boolean,
): IdeaAssessmentState {
  const { normalizedRange, previousRange } = useMemo(() => buildRangeWindows(range), [range]);

  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['idea-assessments', companyId, normalizedRange.start, normalizedRange.end, cycleId ?? 'none'],
    [companyId, cycleId, normalizedRange.end, normalizedRange.start],
  );

  const metricsQuery = useQuery<IdeaAssessmentMetric[]>({
    queryKey,
    enabled: enabled && Boolean(companyId),
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Missing company context');
      }

      const [beforeSnapshot, afterSnapshot] = await Promise.all([
        fetchKpiSnapshot(companyId, previousRange),
        fetchKpiSnapshot(companyId, normalizedRange),
      ]);

      const beforeMap = new Map(
        beforeSnapshot.map((item) => [
          item.id ?? item.metric ?? item.label,
          {
            value: Number(item.value ?? 0),
            unit: item.unit ?? null,
          },
        ]),
      );

      return afterSnapshot.map((item, index) => {
        const id = item.id ?? item.metric ?? item.label ?? `metric-${index}`;
        const before = beforeMap.get(id) ?? { value: 0, unit: item.unit ?? null };
        const after = Number(item.value ?? 0);
        const delta = after - before.value;
        const roi = before.value === 0 ? null : Number(((delta / Math.abs(before.value)) * 100).toFixed(2));

        return {
          metric: item.label ?? item.metric ?? `Metric ${index + 1}`,
          before: Number(before.value ?? 0),
          after,
          delta,
          roi,
          unit: item.unit ?? before.unit ?? null,
        };
      });
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const saveMutation = useMutation({
    mutationFn: async (notes?: string) => {
      if (!companyId) {
        throw new Error('Missing company context');
      }

      return persistAssessment({
        companyId,
        cycleId,
        metrics: metricsQuery.data ?? [],
        latestInsights,
        rangeLabel: formatRangeAsPgDate(range),
        notes,
      });
    },
    onSuccess: refresh,
  });

  return {
    data: metricsQuery.data ?? [],
    loading: metricsQuery.isLoading || saveMutation.isPending,
    error: (metricsQuery.error as Error) ?? null,
    refresh,
    saveAssessment: saveMutation.mutateAsync,
  };
}
