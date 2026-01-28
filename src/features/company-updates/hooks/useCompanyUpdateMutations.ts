import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  companyUpdatesRepository,
  type CompanyUpdateRow,
  type CommentRow,
} from "@/repositories/companyUpdatesRepository";
import type { CreateCompanyUpdateInput } from "@/types/companyUpdates";

const UPDATES_QUERY_KEY = "company-updates";
const COMMENTS_QUERY_KEY = "company-update-comments";

type CachedUpdateRow = CompanyUpdateRow & {
  viewerHasLiked?: boolean;
  viewerHasViewed?: boolean;
};

type UpdatesQueryData =
  | { records: CachedUpdateRow[]; total: number }
  | undefined;

type ToggleLikeVariables = {
  updateId: string;
  currentlyLiked: boolean;
};

type MarkViewedVariables = {
  updateId: string;
};

type CommentVariables = {
  updateId: string;
  content: string;
};

const clone = <T>(value: T): T => structuredClone(value);

export function useCompanyUpdateMutations() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const queryClient = useQueryClient();

  const invalidateUpdates = () => {
    queryClient.invalidateQueries({ queryKey: [UPDATES_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY] });
  };

  const applyUpdateToQueries = (
    updater: (data: UpdatesQueryData) => UpdatesQueryData,
  ) => {
    const queries = queryClient.getQueriesData<UpdatesQueryData>({
      queryKey: [UPDATES_QUERY_KEY],
    });
    queries.forEach(([key, data]) => {
      queryClient.setQueryData(key, updater(clone(data)));
    });
  };

  const createUpdateMutation = useMutation({
    mutationFn: async (input: CreateCompanyUpdateInput) => {
      if (!companyId) throw new Error("Missing company context.");
      await companyUpdatesRepository.createUpdate({
        companyId,
        payload: input,
      });
    },
    onSuccess: () => {
      invalidateUpdates();
      toast({
        title: "Update created",
        description: "Your announcement is now live.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to create update",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (updateId: string) => {
      if (!companyId) throw new Error("Missing company context.");
      await companyUpdatesRepository.updateStatus({
        companyId,
        updateId,
        status: "archived",
      });
    },
    onSuccess: invalidateUpdates,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      updateId,
      payload,
    }: {
      updateId: string;
      payload: Partial<Record<string, unknown>>;
    }) => {
      if (!companyId) throw new Error("Missing company context.");
      await companyUpdatesRepository.updateUpdate({
        companyId,
        updateId,
        payload,
      });
    },
    onSuccess: () => {
      invalidateUpdates();
      toast({
        title: "Update updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to update",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (updateId: string) => {
      if (!companyId) throw new Error("Missing company context.");
      await companyUpdatesRepository.deleteUpdate({ companyId, updateId });
    },
    onSuccess: invalidateUpdates,
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({
      updateId,
      isPinned,
    }: {
      updateId: string;
      isPinned: boolean;
    }) => {
      if (!companyId) throw new Error("Missing company context.");
      await companyUpdatesRepository.togglePin({
        companyId,
        updateId,
        isPinned,
      });
    },
    onMutate: async ({ updateId, isPinned }) => {
      applyUpdateToQueries((data) => {
        if (!data) return data;
        return {
          ...data,
          records: data.records.map((record) =>
            record.id === updateId
              ? { ...record, is_pinned: isPinned }
              : record,
          ),
        };
      });
      return { updateId, isPinned };
    },
    onError: () => invalidateUpdates(),
    onSettled: invalidateUpdates,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ updateId, currentlyLiked }: ToggleLikeVariables) => {
      if (!companyId || !profile?.id) throw new Error("Missing user context.");
      if (currentlyLiked) {
        await companyUpdatesRepository.deleteReaction({
          companyId,
          updateId,
          userId: profile.id,
          reactionType: "like",
        });
      } else {
        await companyUpdatesRepository.upsertReaction({
          companyId,
          updateId,
          userId: profile.id,
          reactionType: "like",
        });
      }
    },
    onMutate: async ({ updateId, currentlyLiked }) => {
      const delta = currentlyLiked ? -1 : 1;
      applyUpdateToQueries((data) => {
        if (!data) return data;
        return {
          ...data,
          records: data.records.map((record) =>
            record.id === updateId
              ? {
                  ...record,
                  likes_count: Math.max(0, (record.likes_count ?? 0) + delta),
                  viewerHasLiked: !currentlyLiked,
                }
              : record,
          ),
        };
      });
      return { updateId, currentlyLiked };
    },
    onError: () => invalidateUpdates(),
    onSettled: invalidateUpdates,
  });

  const markViewedMutation = useMutation({
    mutationFn: async ({ updateId }: MarkViewedVariables) => {
      if (!companyId || !profile?.id) return;
      await companyUpdatesRepository.upsertReaction({
        companyId,
        updateId,
        userId: profile.id,
        reactionType: "view",
      });
    },
    onMutate: async ({ updateId }) => {
      applyUpdateToQueries((data) => {
        if (!data) return data;
        return {
          ...data,
          records: data.records.map((record) =>
            record.id === updateId
              ? {
                  ...record,
                  viewerHasViewed: true,
                  views_count:
                    (record.views_count ?? 0) +
                    (record.viewerHasViewed ? 0 : 1),
                }
              : record,
          ),
        };
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ updateId, content }: CommentVariables) => {
      if (!companyId || !profile?.id) throw new Error("Missing user context.");
      await companyUpdatesRepository.createComment({
        companyId,
        updateId,
        userId: profile.id,
        content,
      });
    },
    onMutate: async ({ updateId, content }) => {
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticComment: CommentRow = {
        id: tempId,
        update_id: updateId,
        company_id: companyId ?? "",
        author_id: profile?.id ?? "me",
        content,
        likes_count: 0,
        created_at: now,
        updated_at: now,
        author: {
          id: profile?.id ?? "me",
          first_name: profile?.first_name ?? profile?.firstName ?? "",
          last_name: profile?.last_name ?? profile?.lastName ?? "",
          avatar_url: profile?.avatar_url ?? null,
        },
      };

      const queries = queryClient.getQueriesData<CommentRow[]>({
        queryKey: [COMMENTS_QUERY_KEY],
      });
      queries.forEach(([key, data]) => {
        if (!data) {
          queryClient.setQueryData(key, [optimisticComment]);
        } else {
          queryClient.setQueryData(key, [...data, optimisticComment]);
        }
      });

      applyUpdateToQueries((data) => {
        if (!data) return data;
        return {
          ...data,
          records: data.records.map((record) =>
            record.id === updateId
              ? {
                  ...record,
                  comments_count: (record.comments_count ?? 0) + 1,
                }
              : record,
          ),
        };
      });

      return { tempId };
    },
    onError: () => invalidateUpdates(),
    onSettled: invalidateUpdates,
  });

  const ensureCompany = () => {
    if (!companyId) {
      throw new Error("Missing company context.");
    }
  };

  const ensureUser = () => {
    if (!companyId || !profile?.id) {
      throw new Error("Missing user context.");
    }
  };

  return {
    createUpdate: (input: CreateCompanyUpdateInput) => {
      ensureCompany();
      return createUpdateMutation.mutateAsync(input);
    },
    updateUpdate: (
      updateId: string,
      payload: Partial<Record<string, unknown>>,
    ) => {
      ensureCompany();
      return updateMutation.mutateAsync({ updateId, payload });
    },
    archiveUpdate: (updateId: string) => {
      ensureCompany();
      return archiveMutation.mutateAsync(updateId);
    },
    deleteUpdate: (updateId: string) => {
      ensureCompany();
      return deleteMutation.mutateAsync(updateId);
    },
    togglePin: ({
      updateId,
      isPinned,
    }: {
      updateId: string;
      isPinned: boolean;
    }) => {
      ensureCompany();
      return togglePinMutation.mutateAsync({ updateId, isPinned });
    },
    toggleLike: ({ updateId, currentlyLiked }: ToggleLikeVariables) => {
      ensureUser();
      return likeMutation.mutateAsync({ updateId, currentlyLiked });
    },
    markAsViewed: ({ updateId }: MarkViewedVariables) => {
      ensureCompany();
      markViewedMutation.mutate({ updateId });
    },
    addComment: ({ updateId, content }: CommentVariables) => {
      ensureUser();
      return commentMutation.mutateAsync({ updateId, content });
    },
  };
}
