import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import type { TaskWithRelations } from "@/hooks/useTasks";
import {
  fetchTaskComments,
  insertTaskComment,
  type TaskCommentWithUser,
} from "@/features/tasks/repositories/tasksRepository";
import { logger } from "@/utils/logger";

export type { TaskCommentWithUser };

export function useTaskComments(task: TaskWithRelations | null, open: boolean) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);

  const [comments, setComments] = useState<TaskCommentWithUser[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState(false);

  const loadComments = useCallback(async () => {
    if (!task?.id || !open) {
      setComments([]);
      setCommentsError(null);
      return;
    }

    setLoadingComments(true);
    setCommentsError(null);
    try {
      const data = await fetchTaskComments(task.id);
      setComments(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("tasks.commentsLoadFailed");
      logger.error("Error fetching comments:", { error, tags: ["error"] });
      setComments([]);
      setCommentsError(message);
    } finally {
      setLoadingComments(false);
    }
  }, [open, t, task?.id]);

  useEffect(() => {
    if (open && task?.id) {
      void loadComments();
    } else if (!open) {
      setComments([]);
      setCommentsError(null);
    }
  }, [open, task?.id, loadComments]);

  const submitComment = useCallback(
    async (message: string): Promise<{ success: boolean; error?: Error }> => {
      if (!task?.id || !message.trim() || !user) {
        return { success: false };
      }
      setAddingComment(true);
      try {
        const created = await insertTaskComment(
          task.id,
          user.id,
          message.trim(),
          companyId ? { companyId, sourceLocale } : undefined,
        );
        const withUser: TaskCommentWithUser = {
          ...created,
          user: profile
            ? {
                first_name: profile.first_name ?? "",
                last_name: profile.last_name ?? "",
              }
            : null,
        };
        setComments((prev) => [...prev, withUser]);
        return { success: true };
      } catch (error) {
        logger.error("Error adding comment:", { error, tags: ["error"] });
        return { success: false, error: error as Error };
      } finally {
        setAddingComment(false);
      }
    },
    [companyId, profile, sourceLocale, task?.id, user],
  );

  return {
    comments,
    loadingComments,
    commentsError,
    addingComment,
    submitComment,
    refreshComments: loadComments,
  };
}