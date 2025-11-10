import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IdeaActionStatus = 'pending' | 'executed' | 'failed';

export interface IdeaActionRecord {
  id: string;
  company_id: string;
  cycle_id: string | null;
  action_name: string;
  status: IdeaActionStatus;
  result: Record<string, unknown> | null;
  created_at: string;
}

interface CreateActionInput {
  recommendationId?: string;
  action: string;
  impact?: string;
  autoExecute?: boolean;
  metadata?: Record<string, unknown>;
}

interface ExecuteActionOptions {
  actionId: string;
  result?: Record<string, unknown>;
}

interface IdeaActionsState {
  data: IdeaActionRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createAction: (input: CreateActionInput) => Promise<IdeaActionRecord | null>;
  execute: (options: ExecuteActionOptions) => Promise<IdeaActionRecord | null>;
}

export function useIdeaActions(companyId: string | undefined, cycleId: string | null): IdeaActionsState {
  const [actions, setActions] = useState<IdeaActionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchActions = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setError(new Error('Missing company context'));
      setActions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('idea_actions').select('*').eq('company_id', companyId);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data, error: selectError } = await query.order('created_at', { ascending: false });

      if (selectError) {
        throw selectError;
      }

      setActions((data ?? []) as IdeaActionRecord[]);
    } catch (caughtError) {
      setError(caughtError as Error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, cycleId]);

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchActions, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const createAction = useCallback(
    async ({ recommendationId, action, impact, autoExecute = false, metadata }: CreateActionInput) => {
      if (!companyId) {
        throw new Error('Missing company context');
      }
      if (!cycleId) {
        throw new Error('Missing IDEA cycle. Wait for a cycle to start before queuing actions.');
      }

      const resultPayload = {
        ...(impact ? { impact } : {}),
        ...(metadata ?? {}),
        ...(recommendationId ? { recommendationId } : {}),
      };

      const payload = {
        company_id: companyId,
        cycle_id: cycleId,
        action_name: action,
        status: autoExecute ? 'executed' : 'pending',
        result: Object.keys(resultPayload).length > 0 ? resultPayload : null,
      };

      const { data, error: insertError } = await supabase
        .from('idea_actions')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (autoExecute && data) {
        await supabase
          .from('idea_actions')
          .update({ status: 'executed' })
          .eq('id', data.id);
      }

      refresh();
      return data as IdeaActionRecord;
    },
    [companyId, cycleId, refresh],
  );

  const execute = useCallback(
    async ({ actionId, result }: ExecuteActionOptions) => {
      if (!companyId) {
        throw new Error('Missing company context');
      }

      const { data, error: updateError } = await supabase
        .from('idea_actions')
        .update({
          status: 'executed',
          result: result ?? null,
        })
        .eq('company_id', companyId)
        .eq('id', actionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      refresh();
      return data as IdeaActionRecord;
    },
    [companyId, refresh],
  );

  return {
    data: actions,
    loading,
    error,
    refresh,
    createAction,
    execute,
  };
}
