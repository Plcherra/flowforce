import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  const fetchInsights = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setError(new Error('Missing company context'));
      setInsights([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_kpi_summary', {
        company_id: companyId,
        range: normalizedRange,
      });

      if (rpcError) {
        throw rpcError;
      }

      const parsed: IdeaKpiInsight[] = Array.isArray(data)
        ? data.map((item: any, index: number) => ({
            id: item.id ?? `kpi-${index}`,
            label: item.label ?? item.metric ?? 'Metric',
            value: Number(item.value ?? 0),
            delta: typeof item.delta === 'number' ? item.delta : item.delta ? Number(item.delta) : null,
            trend: item.trend === 'up' || item.trend === 'down' || item.trend === 'flat' ? item.trend : undefined,
            unit: item.unit ?? null,
          }))
        : [];

      setInsights(parsed);
    } catch (caughtError) {
      setError(caughtError as Error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, normalizedRange]);

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

