import { useCallback, useEffect, useMemo, useState } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_IDEA_KPI_SUMMARY } from '@/mock/kpi_insights';
import type { DateRange, IdeaKpiInsight } from './useIdeaInsights';
import { formatRangeAsPgDate } from '@/modules/operations/utils/dateRange';

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

async function fetchKpiSnapshot(companyId: string, range: { start: string; end: string }) {
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
      }));
    }
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export function useIdeaAssessments(
  companyId: string | undefined,
  range: DateRange,
  cycleId: string | null,
  latestInsights: IdeaKpiInsight[],
  enabled: boolean,
): IdeaAssessmentState {
  const [metrics, setMetrics] = useState<IdeaAssessmentMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const normalizedRange = useMemo(() => {
    const start = range.start.toISOString();
    const end = range.end.toISOString();
    return { start, end };
  }, [range.start, range.end]);

  const previousRange = useMemo(() => {
    const durationMs = Math.max(differenceInMilliseconds(range.end, range.start), 1);
    const previousEnd = new Date(range.start.getTime());
    const previousStart = new Date(previousEnd.getTime() - durationMs);
    return {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
    };
  }, [range.end, range.start]);

  const loadAssessments = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!companyId) {
      setError(new Error('Missing company context'));
      setMetrics([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [beforeSnapshot, afterSnapshot] = await Promise.all([
        fetchKpiSnapshot(companyId, previousRange),
        fetchKpiSnapshot(companyId, normalizedRange),
      ]);

      const beforeMap = new Map(
        beforeSnapshot.map((item: any) => [
          item.id ?? item.metric ?? item.label,
          {
            value: Number(item.value ?? 0),
            unit: item.unit ?? null,
          },
        ]),
      );

      const nextMetrics: IdeaAssessmentMetric[] = (afterSnapshot as any[]).map((item, index) => {
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

      setMetrics(nextMetrics);
    } catch (caughtError) {
      setError(caughtError as Error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, enabled, normalizedRange, previousRange]);

  useEffect(() => {
    loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAssessments, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const saveAssessment = useCallback(
    async (notes?: string) => {
    if (!companyId) {
      throw new Error('Missing company context');
    }

      const assessmentsPayload = {
        metrics,
        notes: notes ?? null,
      };

      const targetMutation = cycleId
        ? supabase
            .from('idea_cycles')
            .update({
              stage: 'assess',
              assessments: assessmentsPayload,
            })
            .eq('id', cycleId)
            .select()
            .single()
        : supabase
            .from('idea_cycles')
            .insert({
              company_id: companyId,
              stage: 'assess',
              range: formatRangeAsPgDate(range),
              insights: latestInsights,
              actions: null,
              assessments: assessmentsPayload,
            })
            .select()
            .single();

      const { error: mutationError } = await targetMutation;

      if (mutationError) {
        throw mutationError;
      }
    },
    [companyId, cycleId, latestInsights, metrics, range],
  );

  return {
    data: metrics,
    loading,
    error,
    refresh,
    saveAssessment,
  };
}
