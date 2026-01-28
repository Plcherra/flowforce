import { useCallback, useEffect, useState } from "react";
import { useTasks, type TaskWithRelations } from "@/hooks/useTasks";
import type { Tables } from "@/integrations/supabase/public-types";
import { logger } from "@/utils/logger";

export type TaskCommentRow = Tables<"task_comments">;
export type TaskCommentWithUser = TaskCommentRow & {
  user?: {
    first_name: string;
    last_name: string;
  } | null;
};

export function useTaskComments(task: TaskWithRelations | null, open: boolean) {
  const { addComment, getTaskComments } = useTasks();
  const [comments, setComments] = useState<TaskCommentWithUser[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  const refreshComments = useCallback(async () => {
    if (!task?.id || !open) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    try {
      const { data } = await getTaskComments(task.id);
      setComments((data as TaskCommentWithUser[]) ?? []);
    } catch (error) {
      logger.error("Error fetching comments:", { error, tags: ["error"] });
    } finally {
      setLoadingComments(false);
    }
  }, [getTaskComments, open, task?.id]);

  useEffect(() => {
    if (open && task?.id) {
      refreshComments();
    } else if (!open) {
      setComments([]);
    }
  }, [open, task?.id, refreshComments]);

  const submitComment = useCallback(
    async (message: string): Promise<{ success: boolean; error?: Error }> => {
      if (!task?.id || !message.trim()) {
        return { success: false };
      }
      setAddingComment(true);
      try {
        const { data, error } = await addComment(task.id, message.trim());
        if (error || !data) {
          throw error ?? new Error("Unable to add comment");
        }
        setComments((prev) => [...prev, data as TaskCommentWithUser]);
        return { success: true };
      } catch (error) {
        logger.error("Error adding comment:", { error, tags: ["error"] });
        return { success: false, error: error as Error };
      } finally {
        setAddingComment(false);
      }
    },
    [addComment, task?.id],
  );

  return {
    comments,
    loadingComments,
    addingComment,
    submitComment,
    refreshComments,
  };
}
