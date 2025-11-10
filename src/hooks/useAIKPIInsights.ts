import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_KPI_INSIGHTS } from '@/mock/kpi_insights';

export interface AIKpiInsight {
  metric: string;
  change: number;
  signal: string;
  impact: string;
}

type RangeInput =
  | string
  | {
      start: Date | string;
      end: Date | string;
    }
  | null
  | undefined;

const normalizeCompanyId = (companyId?: string | null) => {
  if (typeof companyId !== 'string') {
    return undefined;
  }
  const trimmed = companyId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeRange = (range: RangeInput) => {
  if (!range) {
    return undefined;
  }

  if (typeof range === 'string') {
    const trimmed = range.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const resolve = (value: Date | string) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  };

  return {
    start: resolve(range.start),
    end: resolve(range.end),
  };
};

export function useAIKPIInsights(companyId?: string | null, range?: RangeInput) {
  const cleanCompanyId = normalizeCompanyId(companyId);
  const cleanRange = normalizeRange(range);

  const queryKey = useMemo(() => {
    if (typeof cleanRange === 'string') {
      return ['ai-kpi-insights', cleanCompanyId, cleanRange];
    }

    if (cleanRange) {
      return ['ai-kpi-insights', cleanCompanyId, cleanRange.start, cleanRange.end];
    }

    return ['ai-kpi-insights', cleanCompanyId, null];
  }, [cleanCompanyId, cleanRange]);

  return useQuery({
    queryKey,
    enabled: Boolean(cleanCompanyId && cleanRange),
    staleTime: 60_000,
    queryFn: async () => {
      if (!cleanCompanyId) {
        throw new Error('Missing company context');
      }

      if (!cleanRange) {
        throw new Error('Missing date range');
      }

      const rpcPayload =
        typeof cleanRange === 'string'
          ? { range_start: cleanRange, range_end: null }
          : cleanRange
            ? { range_start: cleanRange.start, range_end: cleanRange.end }
            : {};

      const { data, error } = await supabase.rpc('get_ai_kpi_insights', {
        company_id: cleanCompanyId,
        ...rpcPayload,
      });

      if (error) {
        if (error.message?.includes('get_ai_kpi_insights')) {
          if (import.meta.env.DEV) {
            console.warn(
              '[useAIKPIInsights] RPC get_ai_kpi_insights unavailable, returning mock data.',
              error.message,
            );
          }
          return MOCK_KPI_INSIGHTS.map((item) => ({ ...item })) as AIKpiInsight[];
        }
        throw error;
      }

      if (!Array.isArray(data)) {
        return [];
      }

      return data as AIKpiInsight[];
    },
  });
}
