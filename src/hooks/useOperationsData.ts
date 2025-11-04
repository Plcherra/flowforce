import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export type OperationsInsightRecord = {
  id?: string;
  company_id?: string;
  metric: string;
  value?: number | null;
  change?: number | null;
  signal?: string | null;
  impact?: string | null;
  created_at?: string;
};

const normalizeCompanyId = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function useOperationsData() {
  const { profile } = useProfile();

  const companyId = useMemo(() => {
    return (
      normalizeCompanyId(profile?.company_id) ??
      normalizeCompanyId(profile?.companyId) ??
      normalizeCompanyId(import.meta.env.VITE_DEFAULT_COMPANY_ID)
    );
  }, [profile?.companyId, profile?.company_id]);

  const query = useQuery({
    queryKey: ['kpi-insights', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Missing company context');
      }

      const { data, error } = await supabase
        .from('kpi_insights')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      return (data as OperationsInsightRecord[] | null) ?? [];
    },
    staleTime: 60_000,
  });

  return {
    ...query,
    data: (query.data ?? []) as OperationsInsightRecord[],
    companyId,
  };
}
