// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WizardFormData } from './types';

export interface RecipientSegment {
  id: string;
  name: string;
  count: number;
  type: 'departments' | 'roles' | 'groups';
  coverage?: number;
}

export interface RecipientInsightsState {
  totalEmployees: number;
  activeFilters: number;
  estimatedReach: number;
  segments: RecipientSegment[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: RecipientInsightsState = {
  totalEmployees: 0,
  activeFilters: 0,
  estimatedReach: 0,
  segments: [],
  loading: true,
  error: null,
};

export function useRecipientInsights(formData: WizardFormData) {
  const [state, setState] = useState<RecipientInsightsState>(INITIAL_STATE);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data: aggregation, error } = await supabase.rpc('get_recipient_insights', {
          recipients_filter: formData.recipients,
        });

        if (error) throw error;

        if (cancelled) return;

        setState({
          totalEmployees: aggregation?.total_employees ?? 0,
          activeFilters: aggregation?.active_filters ?? 0,
          estimatedReach: aggregation?.estimated_reach ?? 0,
          segments: (aggregation?.segments ?? []).map((segment: any) => ({
            id: segment.id,
            name: segment.name,
            count: segment.count,
            type: segment.type,
            coverage: segment.coverage ?? undefined,
          })),
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Failed to load recipient insights', err);
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: 'Unable to load recipient metrics' }));
          toast({
            title: 'Recipient metrics unavailable',
            description: 'We could not fetch the latest recipient counts. Try again soon.',
            variant: 'destructive',
          });
        }
      }
    };

    fetchInsights();

    return () => {
      cancelled = true;
    };
  }, [formData.recipients, toast]);

  const actionItems = useMemo(() => {
    const items: string[] = [];

    if (state.activeFilters === 0 && formData.recipients.type !== 'all') {
      items.push('Add at least one audience to avoid sending to zero people.');
    }

    if (state.estimatedReach === 0 && formData.recipients.type !== 'all') {
      items.push('No employees match the current filters. Adjust the selection.');
    }

    if (state.estimatedReach > state.totalEmployees * 0.8 && formData.recipients.type !== 'all') {
      items.push('You are targeting most of the company—consider sending to everyone.');
    }

    return items;
  }, [state.activeFilters, state.estimatedReach, state.totalEmployees, formData.recipients.type]);

  return {
    ...state,
    actionItems,
  };
}
