import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IdeaKpiInsight } from './useIdeaInsights';

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
): IdeaDiagnosticsState {
  const [result, setResult] = useState<IdeaDiagnosticsResult>({
    causes: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const payload = useMemo(() => {
    return insights.map((insight) => ({
      id: insight.id,
      label: insight.label,
      value: insight.value,
      delta: insight.delta ?? 0,
      trend: insight.trend ?? 'flat',
    }));
  }, [insights]);

  const runDiagnostics = useCallback(async () => {
    if (!companyId) {
      setError(new Error('Missing company context'));
      setResult({ causes: [], recommendations: [] });
      return;
    }

    if (payload.length === 0) {
      setResult({ causes: [], recommendations: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          insights: payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diagnostics request failed (${response.status})`);
      }

      const body = await response.json();
      const causes = Array.isArray(body?.causes)
        ? body.causes.map((cause: any, index: number) => ({
            id: cause.id ?? `cause-${index}`,
            summary: cause.summary ?? cause.description ?? 'Potential contributing factor',
            confidence: typeof cause.confidence === 'number' ? cause.confidence : 0,
          }))
        : [];

      const recommendations = Array.isArray(body?.recommendations)
        ? body.recommendations.map((item: any, index: number) => ({
            id: item.id ?? `recommendation-${index}`,
            action: item.action ?? item.title ?? 'Suggested action',
            impact: item.impact ?? item.reason ?? 'Projected impact unavailable',
            confidence: typeof item.confidence === 'number' ? item.confidence : 0,
          }))
        : [];

      setResult({ causes, recommendations });
    } catch (caughtError) {
      setError(caughtError as Error);
      setResult({ causes: [], recommendations: [] });
    } finally {
      setLoading(false);
    }
  }, [companyId, payload]);

  useEffect(() => {
    if (payload.length === 0) {
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

