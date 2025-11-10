import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_IDEA_KPI_SUMMARY } from '@/mock/kpi_insights';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface IdeaKpiInsight {
  id: string;
  label: string;
  value: number;
  delta?: number | null;
  trend?: 'up' | 'down' | 'flat';
  unit?: string | null;
}

interface IdeaInsightsState {
  data: IdeaKpiInsight[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useIdeaInsights(companyId: string | undefined, range: DateRange): IdeaInsightsState {
  const [insights, setInsights] = useState<IdeaKpiInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const normalizedRange = useMemo(
    () => ({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    }),
    [range.start, range.end],
  );

  const mapRecordsToInsights = useCallback((records: any): IdeaKpiInsight[] => {
    if (!Array.isArray(records)) {
      return [];
    }

    return records.map((item: any, index: number) => ({
      id: item.id ?? `kpi-${index}`,
      label: item.label ?? item.metric ?? 'Metric',
      value: Number(item.value ?? 0),
      delta: typeof item.delta === 'number' ? item.delta : item.delta ? Number(item.delta) : null,
      trend: item.trend === 'up' || item.trend === 'down' || item.trend === 'flat' ? item.trend : undefined,
      unit: item.unit ?? null,
    }));
  }, []);

  const fetchInsights = useCallback(async () => {
    if (!companyId) {
      setInsights([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_kpi_summary', {
        company_id: companyId,
        range_start: normalizedRange.start,
        range_end: normalizedRange.end,
      });

      if (rpcError) {
        throw rpcError;
      }

      setInsights(mapRecordsToInsights(data));
    } catch (caughtError) {
      const error = caughtError as Error;
      const message = error?.message ?? '';

      if (message.includes('function public.get_kpi_summary')) {
        if (import.meta.env.DEV) {
          console.warn(
            '[useIdeaInsights] RPC get_kpi_summary unavailable, returning mock IDEA KPI summary.',
            message,
          );
        }
        setError(null);
        setInsights(mapRecordsToInsights(MOCK_IDEA_KPI_SUMMARY));
        return;
      }

      setError(error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, mapRecordsToInsights, normalizedRange]);

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInsights, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    data: insights,
    loading,
    error,
    refresh,
  };
}
