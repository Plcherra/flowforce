import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { CompanyUpdate, UpdateComment, CreateCompanyUpdateInput } from '@/types/companyUpdates';
import { companyUpdatesRepository, type CompanyUpdateRow, type ReactionRow, type CommentRow } from '@/repositories/companyUpdatesRepository';

const DEFAULT_PAGE_SIZE = 25;

type UseCompanyUpdateOptions = {
  page?: number;
  pageSize?: number;
  status?: CompanyUpdate['status'] | CompanyUpdate['status'][];
  searchTerm?: string;
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
  const statusFilter = options?.status;
  const searchTerm = options?.searchTerm?.trim() ?? '';
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const updatesQuery = useQuery({
    queryKey: ['company-updates', companyId, page, pageSize, statusFilter ?? 'all', searchTerm.toLowerCase()],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return { records: [] as CompanyUpdateRow[], total: 0 };
      }

      return companyUpdatesRepository.listUpdates({
        companyId,
        page,
        pageSize,
        statusFilter,
        searchTerm,
      });
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

      return companyUpdatesRepository.listReactions({
        companyId,
        userId: user.id,
        updateIds,
      });
    },
  });

  const commentsQuery = useQuery({
    queryKey: ['company-update-comments', companyId, updateIds.join(',')],
    enabled: Boolean(companyId && updateIds.length > 0),
    queryFn: async () => {
      if (!companyId || updateIds.length === 0) {
        return [] as CommentRow[];
      }

      return companyUpdatesRepository.listComments({
        companyId,
        updateIds,
      });
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

      await companyUpdatesRepository.createUpdate({
        companyId,
        payload: {
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
        },
      });

      invalidateFeed();
    },
    [companyId, user?.id, profile, invalidateFeed],
  );

  const archiveUpdate = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      await companyUpdatesRepository.updateStatus({ companyId, updateId, status: 'archived' });
      invalidateFeed();
    },
    [companyId, invalidateFeed],
  );

  const deleteUpdate = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      await companyUpdatesRepository.deleteUpdate({ companyId, updateId });
      invalidateFeed();
    },
    [companyId, invalidateFeed],
  );

  const togglePin = useCallback(
    async (updateId: string) => {
      if (!companyId) return;
      const current = updates.find((update) => update.id === updateId);
      const nextValue = current ? !current.isPinned : true;
      await companyUpdatesRepository.togglePin({ companyId, updateId, isPinned: nextValue });
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
        await companyUpdatesRepository.deleteReaction({
          companyId,
          updateId,
          userId: user.id,
          reactionType: 'like',
        });
      } else {
        await companyUpdatesRepository.upsertReaction({
          companyId,
          updateId,
          userId: user.id,
          reactionType: 'like',
        });
      }

      invalidateFeed();
    },
    [companyId, user?.id, viewerLikes, invalidateFeed],
  );

  const markAsViewed = useCallback(
    async (updateId: string) => {
      if (!companyId || !user?.id || viewerViews.has(updateId)) return;

      await companyUpdatesRepository.upsertReaction({
        companyId,
        updateId,
        userId: user.id,
        reactionType: 'view',
      });
      invalidateFeed();
    },
    [companyId, user?.id, viewerViews, invalidateFeed],
  );

  const addComment = useCallback(
    async (updateId: string, content: string) => {
      if (!companyId || !user?.id) {
        throw new Error('You must be signed in to comment.');
      }

      await companyUpdatesRepository.createComment({
        companyId,
        updateId,
        userId: user.id,
        content,
      });
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
