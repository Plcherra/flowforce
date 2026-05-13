import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { CompanyUpdate } from "@/types/companyUpdates";
import {
  companyUpdatesRepository,
  type CompanyUpdateRow,
  type ReactionRow,
} from "@/features/company-updates/repositories/companyUpdatesRepository";
import { safeArrayMap } from "@/utils/reactQueryTypes";

const DEFAULT_PAGE_SIZE = 25;
const UPDATES_QUERY_KEY = "company-updates";
const REACTIONS_QUERY_KEY = "company-update-reactions";

type UseCompanyUpdateOptions = {
  page?: number;
  pageSize?: number;
  status?: CompanyUpdate["status"] | CompanyUpdate["status"][];
  searchTerm?: string;
};

const getFullName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ").trim();

const toCompanyUpdate = (
  row: CompanyUpdateRow,
  likedSet: Set<string>,
  viewedSet: Set<string>,
): CompanyUpdate => ({
  id: row.id,
  companyId: row.company_id,
  title: row.title,
  body: row.body,
  richContent: row.rich_content,
  type: row.update_type,
  priority: row.priority,
  status: row.status,
  backgroundStyle:
    (row.background_style as CompanyUpdate["backgroundStyle"]) ?? null,
  recipients: (row.recipients as CompanyUpdate["recipients"]) ?? null,
  publishingSettings:
    (row.publishing_settings as CompanyUpdate["publishingSettings"]) ?? null,
  assignedEmployees: Array.isArray(row.assigned_employees)
    ? row.assigned_employees
    : [],
  author: {
    id: row.author_id ?? row.created_by ?? null,
    name:
      row.author_name ||
      getFullName(
        row.author_profile?.first_name,
        row.author_profile?.last_name,
      ) ||
      "Company Updates",
    avatar: row.author_avatar ?? row.author_profile?.avatar_url ?? null,
    role: row.author_role ?? row.author_profile?.role ?? null,
  },
  publishDate: row.publish_date ?? row.created_at,
  scheduledDate: row.scheduled_date,
  isPinned: row.is_pinned,
  likes: row.likes_count ?? 0,
  comments: row.comments_count ?? 0,
  views: row.views_count ?? 0,
  viewerHasLiked: likedSet.has(row.id),
  viewerHasViewed: viewedSet.has(row.id),
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  engagement:
    row.company_update_engagement && row.company_update_engagement[0]
      ? {
          engagementScore: row.company_update_engagement[0].engagement_score,
          aiSummary: row.company_update_engagement[0].ai_summary,
          lastAnalyzed: row.company_update_engagement[0].last_analyzed,
        }
      : null,
});

export function useCompanyUpdates(options?: UseCompanyUpdateOptions) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const statusFilter = options?.status;
  const searchTerm = options?.searchTerm?.trim() ?? "";
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const updatesQuery = useQuery({
    queryKey: [
      UPDATES_QUERY_KEY,
      companyId,
      page,
      pageSize,
      statusFilter ?? "all",
      searchTerm.toLowerCase(),
    ],
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
    queryKey: [REACTIONS_QUERY_KEY, companyId, user?.id, updateIds.join(",")],
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

  const viewerLikes = useMemo(() => {
    const set = new Set<string>();
    (reactionsQuery.data ?? []).forEach((row) => {
      if (row.reaction_type === "like") {
        set.add(row.update_id);
      }
    });
    return set;
  }, [reactionsQuery.data]);

  const viewerViews = useMemo(() => {
    const set = new Set<string>();
    (reactionsQuery.data ?? []).forEach((row) => {
      if (row.reaction_type === "view") {
        set.add(row.update_id);
      }
    });
    return set;
  }, [reactionsQuery.data]);

  const updates = useMemo<CompanyUpdate[]>(() => {
    const records = updatesQuery.data?.records;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return [];
    }

    return safeArrayMap(records, (record) =>
      toCompanyUpdate(record, viewerLikes, viewerViews),
    );
  }, [updatesQuery.data?.records, viewerLikes, viewerViews]);

  return {
    updates,
    loading: updatesQuery.isLoading || reactionsQuery.isLoading,
    error: updatesQuery.error || reactionsQuery.error || null,
    pagination: {
      page,
      pageSize,
      total: updatesQuery.data?.total ?? 0,
    },
    refetch: updatesQuery.refetch,
  };
}
