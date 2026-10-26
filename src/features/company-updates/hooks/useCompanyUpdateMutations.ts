import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import {
  companyUpdatesRepository,
  type CompanyUpdateRow,
  type CommentRow,
} from "@/features/company-updates/repositories/companyUpdatesRepository";
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
  const { t, i18n } = useTranslation();
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
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
      await companyUpdatesRepository.createUpdate({
        companyId,
        payload: input,
        sourceLocale: appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
      });
    },
    onSuccess: (_data, input) => {
      invalidateUpdates();
      const scheduled = input.status === "scheduled";
      toast({
        title: scheduled
          ? t("updates.scheduledBadge")
          : t("updates.updateCreated"),
        description: scheduled
          ? t("updates.scheduledHeld")
          : t("updates.updateCreatedDescription"),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (updateId: string) => {
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
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
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
      await companyUpdatesRepository.updateUpdate({
        companyId,
        updateId,
        payload,
        sourceLocale: appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
      });
    },
    onSuccess: () => {
      invalidateUpdates();
      toast({
        title: t("updates.updateEdited"),
        description: t("updates.updateEditedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("updates.unableToSaveUpdate"),
        description:
          error instanceof Error ? error.message : t("updates.pleaseTryAgain"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (updateId: string) => {
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
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
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
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
      if (!companyId || !profile?.id) throw new Error(t("updates.missingUserContext"));
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
    onError: (error) => {
      invalidateUpdates();
      toast({
        title: t("updates.unableToSaveUpdate"),
        description:
          error instanceof Error ? error.message : t("updates.pleaseTryAgain"),
        variant: "destructive",
      });
    },
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
      if (!companyId || !profile?.id) throw new Error(t("updates.missingUserContext"));
      await companyUpdatesRepository.createComment({
        companyId,
        updateId,
        userId: profile.id,
        content,
        sourceLocale: appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
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

  const publishMutation = useMutation({
    mutationFn: async (updateId: string) => {
      if (!companyId) throw new Error(t("updates.missingCompanyContext"));
      await companyUpdatesRepository.updateStatus({
        companyId,
        updateId,
        status: "published",
      });
    },
    onSuccess: () => {
      invalidateUpdates();
    },
    onError: (error) => {
      toast({
        title: t("updates.unableToPublish"),
        description:
          error instanceof Error ? error.message : t("updates.pleaseTryAgain"),
        variant: "destructive",
      });
    },
  });

  const ensureCompany = () => {
    if (!companyId) {
      throw new Error(t("updates.missingCompanyContext"));
    }
  };

  const ensureUser = () => {
    if (!companyId || !profile?.id) {
      throw new Error(t("updates.missingUserContext"));
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
    publishUpdate: (updateId: string) => {
      ensureCompany();
      return publishMutation.mutateAsync(updateId);
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
