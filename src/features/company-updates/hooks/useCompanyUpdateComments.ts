import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { companyUpdatesRepository } from "@/features/company-updates/repositories/companyUpdatesRepository";
import type { CommentRow } from "@/features/company-updates/repositories/companyUpdatesRepository";
import type { UpdateComment } from "@/types/companyUpdates";

const COMMENTS_QUERY_KEY = "company-update-comments";

export function useCompanyUpdateComments(updateIds: string[]) {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const commentsQuery = useQuery({
    queryKey: [COMMENTS_QUERY_KEY, companyId, updateIds.join(",")],
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

  const commentsByUpdate = useMemo<Record<string, UpdateComment[]>>(() => {
    if (!commentsQuery.data) {
      return {};
    }

    return commentsQuery.data.reduce<Record<string, UpdateComment[]>>(
      (acc, row) => {
        if (!acc[row.update_id]) {
          acc[row.update_id] = [];
        }

        acc[row.update_id].push({
          id: row.id,
          updateId: row.update_id,
          companyId: row.company_id,
          content: row.content,
          likes: row.likes_count ?? 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: {
            id: row.author_id,
            name:
              [row.author?.first_name, row.author?.last_name]
                .filter(Boolean)
                .join(" ") || "Team Member",
            avatar: row.author?.avatar_url ?? null,
          },
        });

        return acc;
      },
      {},
    );
  }, [commentsQuery.data]);

  return {
    commentsByUpdate,
    loading: commentsQuery.isLoading,
    error: commentsQuery.error,
  };
}
