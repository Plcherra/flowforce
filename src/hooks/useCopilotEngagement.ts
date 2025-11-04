import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type CompanyUpdateEngagementRow = {
  id: string;
  update_id: string;
  company_id: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  engagement_score: number | null;
  sentiment_score: number | null;
  ai_summary: string | null;
  last_analyzed: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function useCopilotEngagement(companyId?: string | null) {
  return useQuery({
    queryKey: ['copilot-engagement', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyUpdateEngagementRow[]> => {
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from('company_update_engagement')
        .select('*')
        .eq('company_id', companyId)
        .order('last_analyzed', { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });
}
