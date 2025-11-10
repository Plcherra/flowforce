import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { CompanyUpdate, UpdateComment, CreateCompanyUpdateInput } from '@/types/companyUpdates';

const DEFAULT_PAGE_SIZE = 25;

type UseCompanyUpdateOptions = {
  page?: number;
  pageSize?: number;
};

type CompanyUpdateRow = {
  id: string;
  company_id: string;
  title: string;
  body: string;
  rich_content: string | null;
  update_type: CompanyUpdate['type'];
  priority: CompanyUpdate['priority'];
  status: CompanyUpdate['status'];
  background_style: unknown;
  recipients: unknown;
  publishing_settings: unknown;
  assigned_employees: string[] | null;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  author_avatar: string | null;
  publish_date: string | null;
  scheduled_date: string | null;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
  company_update_engagement?: Array<{
    engagement_score: number | null;
    ai_summary: string | null;
    last_analyzed: string | null;
  }>;
};

type CommentRow = {
  id: string;
  update_id: string;
  company_id: string;
  author_id: string;
  content: string;
  likes_count: number | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ReactionRow = {
  update_id: string;
  reaction_type: 'like' | 'view';
};

const getFullName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(' ').trim();

const toCompanyUpdate = (
  row: CompanyUpdateRow,
  likedSet: Set<string>,
  viewedSet: Set<string>,
): CompanyUpdate => {
  const authorName =
    row.author_name ||
    getFullName(row.author_profile?.first_name, row.author_profile?.last_name) ||
    'Company Updates';

  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    body: row.body,
    richContent: row.rich_content,
    type: row.update_type,
    priority: row.priority,
    status: row.status,
    backgroundStyle: (row.background_style as CompanyUpdate['backgroundStyle']) ?? null,
    recipients: (row.recipients as CompanyUpdate['recipients']) ?? null,
    publishingSettings: (row.publishing_settings as CompanyUpdate['publishingSettings']) ?? null,
    assignedEmployees: Array.isArray(row.assigned_employees) ? row.assigned_employees : [],
    author: {
      id: row.author_id ?? row.author_profile?.id ?? row.created_by ?? null,
      name: authorName,
      avatar: row.author_avatar ?? row.author_profile?.avatar_url ?? null,
      role: row.author_role ?? row.author_profile?.role ?? null,
    },
    publishDate: row.publish_date ?? row.created_at,
    scheduledDate: row.scheduled_date,
    isPinned: row.is_pinned,
    likes: row.likes_count,
    comments: row.comments_count,
    views: row.views_count,
    viewerHasLiked: likedSet.has(row.id),
    viewerHasViewed: viewedSet.has(row.id),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    engagement: row.company_update_engagement && row.company_update_engagement[0]
      ? {
          engagementScore: row.company_update_engagement[0].engagement_score,
          aiSummary: row.company_update_engagement[0].ai_summary,
          lastAnalyzed: row.company_update_engagement[0].last_analyzed,
        }
      : null,
  };
};

const toComment = (row: CommentRow): UpdateComment => ({
  id: row.id,
  updateId: row.update_id,
  companyId: row.company_id,
  content: row.content,
  likes: row.likes_count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.author_id,
    name: getFullName(row.author?.first_name, row.author?.last_name) || 'Team Member',
    avatar: row.author?.avatar_url ?? null,
  },
});

export function useCompanyUpdates(options?: UseCompanyUpdateOptions) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const updatesQuery = useQuery({
    queryKey: ['company-updates', companyId, page, pageSize],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return { records: [], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('company_updates')
        .select(
          `
            *,
            author_profile:profiles!company_updates_author_id_fkey (id, first_name, last_name, avatar_url, role),
            company_update_engagement (
              engagement_score,
              ai_summary,
              last_analyzed
            )
          `,
          { count: 'exact' },
        )
        .eq('company_id', companyId)
        .order('is_pinned', { ascending: false })
        .order('publish_date', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      return {
        records: (data as CompanyUpdateRow[]) ?? [],
        total: count ?? 0,
      };
    },
  });

  const updateIds = useMemo(
    () => (updatesQuery.data?.records ?? []).map((record) => record.id),
    [updatesQuery.data?.records],
  );

  const reactionsQuery = useQuery({
    queryKey: ['company-update-reactions', companyId, user?.id, updateIds.join(',')],
    enabled: Boolean(companyId && user?.id && updateIds.length > 0),
    queryFn: async () => {
      if (!companyId || !user?.id || updateIds.length === 0) {
        return [] as ReactionRow[];
      }

      const { data, error } = await supabase
        .from('company_update_reactions')
        .select('update_id, reaction_type')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .in('update_id', updateIds);

      if (error) {
        throw error;
      }

      return (data as ReactionRow[]) ?? [];
    },
  });

  const commentsQuery = useQuery({
    queryKey: ['company-update-comments', companyId, updateIds.join(',')],
    enabled: Boolean(companyId && updateIds.length > 0),
    queryFn: async () => {
      if (!companyId || updateIds.length === 0) {
        return [] as CommentRow[];
      }

      const { data, error } = await supabase
        .from('company_update_comments')
        .select(
          `
            *,
            author:profiles!company_update_comments_author_id_fkey (id, first_name, last_name, avatar_url)
          `,
        )
        .eq('company_id', companyId)
        .in('update_id', updateIds)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as CommentRow[]) ?? [];
    },
  });

  const viewerLikes = useMemo(() => {
    const set = new Set<string>();
    (reactionsQuery.data ?? []).forEach((row) => {
      if (row.reaction_type === 'like') {
        set.add(row.update_id);
      }
    });
    return set;
  }, [reactionsQuery.data]);

  const viewerViews = useMemo(() => {
    const set = new Set<string>();
    (reactionsQuery.data ?? []).forEach((row) => {
      if (row.reaction_type === 'view') {
        set.add(row.update_id);
      }
    });
    return set;
  }, [reactionsQuery.data]);

  const updates = useMemo<CompanyUpdate[]>(() => {
    if (!updatesQuery.data?.records) {
      return [];
    }

    return updatesQuery.data.records.map((record) => toCompanyUpdate(record, viewerLikes, viewerViews));
  }, [updatesQuery.data?.records, viewerLikes, viewerViews]);

  const comments = useMemo<UpdateComment[]>(() => {
    if (!commentsQuery.data) {
      return [];
    }
    return commentsQuery.data.map(toComment);
  }, [commentsQuery.data]);

  const commentsByUpdate = useMemo<Record<string, UpdateComment[]>>(() => {
    const map: Record<string, UpdateComment[]> = {};
    comments.forEach((comment) => {
      if (!map[comment.updateId]) {
        map[comment.updateId] = [];
      }
      map[comment.updateId].push(comment);
    });
    return map;
  }, [comments]);

  const invalidateFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['company-updates'] });
    queryClient.invalidateQueries({ queryKey: ['company-update-reactions'] });
    queryClient.invalidateQueries({ queryKey: ['company-update-comments'] });
  }, [queryClient]);

  const createUpdate = useCallback(
    async (input: CreateCompanyUpdateInput) => {
      if (!companyId || !user?.id) {
        throw new Error('You must be signed in to create updates.');
      }

      const publishNow = input.publishingSettings?.publishNow ?? true;
      let scheduledDateIso: string | null = null;

      if (!publishNow && input.publishingSettings?.scheduledDate) {
        const scheduledTime = input.publishingSettings.scheduledTime
          ? `T${input.publishingSettings.scheduledTime}`
          : 'T09:00';
        scheduledDateIso = new Date(`${input.publishingSettings.scheduledDate}${scheduledTime}`).toISOString();
      }

      const publishDate = publishNow ? new Date().toISOString() : scheduledDateIso ?? new Date().toISOString();
      const status = publishNow ? 'published' : 'scheduled';
      const authorName =
        input.publishingSettings?.authorName ||
        getFullName(profile?.first_name ?? profile?.firstName, profile?.last_name ?? profile?.lastName) ||
        'Company Updates';

      const { error } = await supabase.from('company_updates').insert({
        company_id: companyId,
        title: input.title,
        body: input.body,
        rich_content: input.richContent ?? null,
        update_type: input.type,
        priority: input.priority,
        status,
        background_style: input.backgroundStyle ?? null,
        recipients: input.recipients ?? null,
        publishing_settings: input.publishingSettings ?? null,
        assigned_employees: input.assignedEmployees ?? null,
        author_id: user.id,
        author_name: authorName,
        author_role: profile?.role ?? null,
        author_avatar: profile?.avatar_url ?? null,
        publish_date: publishDate,
        scheduled_date: scheduledDateIso,
        is_pinned: input.isPinned ?? false,
        created_by: user.id,
      });

      if (error) {
        throw error;
      }

      invalidateFeed();
    },
    [companyId, user?.id, profile, invalidateFeed],
  );

  const archiveUpdate = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      const { error } = await supabase
        .from('company_updates')
        .update({ status: 'archived' })
        .eq('company_id', companyId)
        .eq('id', updateId);
      if (error) throw error;
      invalidateFeed();
    },
    [companyId, invalidateFeed],
  );

  const deleteUpdate = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      const { error } = await supabase.from('company_updates').delete().eq('company_id', companyId).eq('id', updateId);
      if (error) throw error;
      invalidateFeed();
    },
    [companyId, invalidateFeed],
  );

  const togglePin = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      const current = updates.find((update) => update.id === updateId);
      const nextValue = current ? !current.isPinned : true;
      const { error } = await supabase
        .from('company_updates')
        .update({ is_pinned: nextValue })
        .eq('company_id', companyId)
        .eq('id', updateId);
      if (error) throw error;
      invalidateFeed();
    },
    [companyId, updates, invalidateFeed],
  );

  const likeUpdate = useCallback(
    async (updateId: string) => {
      if (!companyId || !user?.id) {
        throw new Error('You must be signed in to react to updates.');
      }

      const hasLiked = viewerLikes.has(updateId);

      if (hasLiked) {
        const { error } = await supabase
          .from('company_update_reactions')
          .delete()
          .eq('company_id', companyId)
          .eq('update_id', updateId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'like');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_update_reactions').insert({
          company_id: companyId,
          update_id: updateId,
          user_id: user.id,
          reaction_type: 'like',
        });
        if (error) throw error;
      }

      invalidateFeed();
    },
    [companyId, user?.id, viewerLikes, invalidateFeed],
  );

  const markAsViewed = useCallback(
    async (updateId: string) => {
      if (!companyId || !user?.id) return;
      if (viewerViews.has(updateId)) {
        return;
      }

      const { error } = await supabase
        .from('company_update_reactions')
        .upsert(
          {
            company_id: companyId,
            update_id: updateId,
            user_id: user.id,
            reaction_type: 'view',
          },
          {
            onConflict: 'update_id,user_id,reaction_type',
            ignoreDuplicates: true,
          },
        );

      if (error) throw error;
      invalidateFeed();
    },
    [companyId, user?.id, viewerViews, invalidateFeed],
  );

  const addComment = useCallback(
    async (updateId: string, content: string) => {
      if (!companyId || !user?.id) {
        throw new Error('You must be signed in to comment.');
      }

      const { error } = await supabase.from('company_update_comments').insert({
        company_id: companyId,
        update_id: updateId,
        author_id: user.id,
        content,
      });

      if (error) throw error;
      invalidateFeed();
    },
    [companyId, user?.id, invalidateFeed],
  );

  const getUpdatesByStatus = useCallback(
    (status: CompanyUpdate['status']) => updates.filter((update) => update.status === status),
    [updates],
  );

  const loading = updatesQuery.isLoading || reactionsQuery.isLoading || commentsQuery.isLoading;
  const error = updatesQuery.error || reactionsQuery.error || commentsQuery.error || null;

  return {
    updates,
    loading,
    error,
    pagination: {
      page,
      pageSize,
      total: updatesQuery.data?.total ?? 0,
    },
    comments,
    commentsByUpdate,
    getUpdatesByStatus,
    likeUpdate,
    addComment,
    markAsViewed,
    togglePin,
    deleteUpdate,
    archiveUpdate,
    createUpdate,
    refetch: updatesQuery.refetch,
  };
}
