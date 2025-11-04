import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { analyzeEngagement } from '@/services/ai/engagementAnalyzer';

type EngagementUpdate = {
  id: string;
  title: string;
  body: string | null;
  companyId: string | null;
  metrics: {
    likes: number;
    comments: number;
    views: number;
  };
  engagementScore: number | null;
  sentimentScore: number | null;
  aiSummary: string | null;
  lastAnalyzed: string | null;
};

type RawEngagementRow = {
  id: string;
  title: string;
  body: string | null;
  company_id: string | null;
  likes: number | null;
  comments_count: number | null;
  views_count: number | null;
  company_update_engagement: null | {
    engagement_score: number | null;
    sentiment_score: number | null;
    ai_summary: string | null;
    likes_count: number | null;
    comments_count: number | null;
    views_count: number | null;
    last_analyzed: string | null;
  } | Array<{
    engagement_score: number | null;
    sentiment_score: number | null;
    ai_summary: string | null;
    likes_count: number | null;
    comments_count: number | null;
    views_count: number | null;
    last_analyzed: string | null;
  }>;
};

const transformRow = (row: RawEngagementRow): EngagementUpdate => {
  const engagementData = Array.isArray(row.company_update_engagement)
    ? row.company_update_engagement[0]
    : row.company_update_engagement ?? null;

  const likes = row.likes ?? engagementData?.likes_count ?? 0;
  const comments = row.comments_count ?? engagementData?.comments_count ?? 0;
  const views = row.views_count ?? engagementData?.views_count ?? 0;

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    companyId: row.company_id,
    metrics: {
      likes,
      comments,
      views,
    },
    engagementScore: engagementData?.engagement_score ?? null,
    sentimentScore: engagementData?.sentiment_score ?? null,
    aiSummary: engagementData?.ai_summary ?? null,
    lastAnalyzed: engagementData?.last_analyzed ?? null,
  };
};

export function useEngagementAnalytics() {
  const queryClient = useQueryClient();

  const updatesQuery = useQuery({
    queryKey: ['engagement-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_updates')
        .select(`
          id,
          title,
          body,
          company_id,
          likes,
          comments_count,
          views_count,
          company_update_engagement (
            engagement_score,
            sentiment_score,
            ai_summary,
            likes_count,
            comments_count,
            views_count,
            last_analyzed
          )
        `)
        .eq('status', 'published');

      if (error) {
        throw error;
      }

      return (data ?? []).map(transformRow);
    },
  });

  const mutation = useMutation({
    mutationFn: async (update: EngagementUpdate) => {
      if (!update.companyId) {
        return;
      }

      const analysis = await analyzeEngagement({
        title: update.title,
        body: update.body ?? '',
        metrics: update.metrics,
      });

      const { error } = await supabase
        .from('company_update_engagement')
        .upsert({
          update_id: update.id,
          company_id: update.companyId,
          likes_count: update.metrics.likes,
          comments_count: update.metrics.comments,
          views_count: update.metrics.views,
          engagement_score: analysis.engagementScore,
          sentiment_score: analysis.sentimentScore,
          ai_summary: analysis.summary,
          last_analyzed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-feed'] });
    },
  });

  const analyze = useCallback(
    (update: EngagementUpdate) => mutation.mutateAsync(update),
    [mutation]
  );

  return {
    updates: updatesQuery.data ?? [],
    isLoading: updatesQuery.isLoading,
    analyze,
    isAnalyzing: mutation.isPending,
  };
}
