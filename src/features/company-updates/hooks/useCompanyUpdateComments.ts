import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyUpdateCommentTranslations } from "@/features/company-updates/hooks/useCompanyUpdateCommentTranslations";
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
        if (!acc[row.updateid]) {
          acc[row.updateid] = [];
        }

        acc[row.updateid].push({
          id: row.id,
          updateId: row.updateid,
          companyId: row.company_id,
          content: row.content,
          likes: row.likes_count ?? 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: {
            id: row.author_id,
            name: [row.author?.first_name, row.author?.last_name]
              .filter(Boolean)
              .join(" "),
            avatar: row.author?.avatar_url ?? null,
          },
        });

        return acc;
      },
      {},
    );
  }, [commentsQuery.data]);
  const flatComments = useMemo(
    () => Object.values(commentsByUpdate).flat(),
    [commentsByUpdate],
  );
  const translations = useCompanyUpdateCommentTranslations(flatComments);
  const translatedCommentsByUpdate = useMemo<Record<string, UpdateComment[]>>(() => {
    const next: Record<string, UpdateComment[]> = {};
    for (const [updateId, comments] of Object.entries(commentsByUpdate)) {
      next[updateId] = comments.map((comment) => ({
        ...comment,
        contentTranslation: translations.get(comment.id) ?? null,
      }));
    }
    return next;
  }, [commentsByUpdate, translations]);

  return {
    commentsByUpdate: translatedCommentsByUpdate,
    loading: commentsQuery.isLoading,
    error: commentsQuery.error,
  };
}
