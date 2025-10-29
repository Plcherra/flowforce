import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  calculateScenarioOutcome,
  mapImpactToPriority,
  type CopilotAction,
  type ScenarioAdjustments,
  type ScenarioBaseline,
  type ScenarioOutcome,
} from '@/lib/ai/scenarioEngine';
import { fetchBusinessAnalyticsSnapshot, getFallbackBusinessSnapshot } from '@/services/analytics/businessAnalyticsService';

export interface UseScenarioSimulatorOptions {
  companyId?: string | null;
  horizonDays?: number;
}

export interface ScenarioSimulatorResult {
  baseline: ScenarioBaseline | null;
  loading: boolean;
  error: string | null;
  isUsingFallback: boolean;
  simulate: (adjustments: ScenarioAdjustments) => ScenarioOutcome;
  triggerCopilot: (actions: CopilotAction[]) => Promise<{ created: number; taskIds: string[] }>;
  lastTriggeredAt: string | null;
  lastTriggeredCount: number | null;
  lastGeneratedActions: CopilotAction[];
  lastTriggeredTaskIds: string[];
  refresh: () => Promise<void>;
}

const DEFAULT_HORIZON_DAYS = 21;
type CreatedTaskRow = { id: string };

export function useScenarioSimulator(options: UseScenarioSimulatorOptions): ScenarioSimulatorResult {
  const { companyId, horizonDays = DEFAULT_HORIZON_DAYS } = options;
  const { user } = useAuth();

  const [baseline, setBaseline] = useState<ScenarioBaseline | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
  const [lastTriggeredAt, setLastTriggeredAt] = useState<string | null>(null);
  const [lastTriggeredCount, setLastTriggeredCount] = useState<number | null>(null);
  const [lastGeneratedActions, setLastGeneratedActions] = useState<CopilotAction[]>([]);
  const [lastTriggeredTaskIds, setLastTriggeredTaskIds] = useState<string[]>([]);

  const fetchBaseline = useCallback(async () => {
    if (!user || !companyId) {
      const fallbackSnapshot = getFallbackBusinessSnapshot();
      setBaseline(fallbackSnapshot.baseline);
      setIsUsingFallback(true);
      setError(companyId ? 'Sign in required to load live data. Showing simulator defaults.' : 'Select or create a company to load live data.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { snapshot, isFallback, notice } = await fetchBusinessAnalyticsSnapshot({
        companyId,
        horizonDays,
        supabaseClient: supabase,
      });

      setBaseline(snapshot.baseline);
      setIsUsingFallback(isFallback);
      setError(isFallback ? notice ?? 'Using simulator defaults.' : null);
      setLoading(false);
    } catch (err) {
      console.error('Scenario simulator baseline error:', err);
      const fallbackSnapshot = getFallbackBusinessSnapshot();
      setBaseline(fallbackSnapshot.baseline);
      setIsUsingFallback(true);
      setError('Unable to load live data; using simulator defaults.');
      setLoading(false);
    }
  }, [companyId, horizonDays, user]);

  useEffect(() => {
    fetchBaseline();
  }, [fetchBaseline]);

  const simulate = useCallback(
    (adjustments: ScenarioAdjustments) =>
      calculateScenarioOutcome(baseline ?? getFallbackBusinessSnapshot().baseline, adjustments),
    [baseline],
  );

  const triggerCopilot = useCallback(
    async (actions: CopilotAction[]) => {
      if (!actions || actions.length === 0) {
        setLastGeneratedActions([]);
        setLastTriggeredTaskIds([]);
        return { created: 0, taskIds: [] };
      }

      if (!user) {
        throw new Error('Sign in to trigger Co-Pilot actions.');
      }

      setLastGeneratedActions(actions);

      const payload = actions.map((action) => ({
        title: `[Co-Pilot] ${action.title}`,
        description: action.summary,
        status: 'todo',
        priority: mapImpactToPriority(action.impact),
        created_by: user.id,
        due_date: action.suggestedDueDate,
        tags: ['copilot', 'scenario', `scenario:${action.type}`],
      }));

      const { data: insertedRows, error: insertError } = await supabase
        .from('tasks')
        .insert(payload)
        .select('id');

      if (insertError) {
        console.error('Failed to push Co-Pilot actions', insertError);
        throw insertError;
      }

      const ids = (insertedRows ?? []).map((row) => (row as CreatedTaskRow).id);

      setLastTriggeredAt(new Date().toISOString());
      setLastTriggeredCount(actions.length);
      setLastTriggeredTaskIds(ids);
      return { created: actions.length, taskIds: ids };
    },
    [user],
  );

  const refresh = useCallback(async () => {
    await fetchBaseline();
  }, [fetchBaseline]);

  return useMemo(
    () => ({
      baseline,
      loading,
      error,
      isUsingFallback,
      simulate,
      triggerCopilot,
      lastTriggeredAt,
      lastTriggeredCount,
      lastGeneratedActions,
      lastTriggeredTaskIds,
      refresh,
    }),
    [
      baseline,
      loading,
      error,
      isUsingFallback,
      simulate,
      triggerCopilot,
      lastTriggeredAt,
      lastTriggeredCount,
      lastGeneratedActions,
      lastTriggeredTaskIds,
      refresh,
    ],
  );
}
