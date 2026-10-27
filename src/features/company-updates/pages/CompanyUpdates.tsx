import { useTranslation } from "react-i18next";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { PageLoader } from "@/components/common/PageLoader";
import { CompanyUpdatesFeedSection } from "@/features/company-updates/components/CompanyUpdatesFeedSection";
import { CompanyUpdatesGridSection } from "@/features/company-updates/components/CompanyUpdatesGridSection";
import { CompanyUpdatesListSection } from "@/features/company-updates/components/CompanyUpdatesListSection";
import { EditUpdateDialog } from "@/features/company-updates/components/EditUpdateDialog";
import { CompanyUpdatesHeader } from "@/features/company-updates/components/CompanyUpdatesHeader";
import {
  canManageCompanyUpdates,
  companyUpdateLoadMessage,
  isCompanyUpdateDue,
} from "@/features/company-updates/companyUpdateAccess";
import {
  CompanyUpdatesPagination,
  PAGE_SIZE_OPTIONS,
} from "@/features/company-updates/components/CompanyUpdatesPagination";
import { CompanyUpdatesSetupState } from "@/features/company-updates/components/CompanyUpdatesSetupState";
import { WizardFallback } from "@/features/company-updates/components/CompanyUpdatesSkeletons";
import { useCommentForm } from "@/features/company-updates/hooks/useCommentForm";
import { useCompanyUpdateComments } from "@/features/company-updates/hooks/useCompanyUpdateComments";
import { useCompanyUpdateFilters } from "@/features/company-updates/hooks/useCompanyUpdateFilters";
import { useCompanyUpdateMutations } from "@/features/company-updates/hooks/useCompanyUpdateMutations";
import { useCan } from "@/hooks/useCan";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { useCompanyUpdates } from "@/hooks/useCompanyUpdates";
import { useProfile } from "@/hooks/useProfile";
import { useRecognitions } from "@/hooks/useRecognitions";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/shared/utils";
import { isMissingBackendResourceError } from "@/shared/utils/supabaseErrors";
import type { CompanyUpdate, UpdateComment } from "@/types/companyUpdates";
import type { WizardFormData } from "@/features/company-updates/wizard/CreateUpdateWizard";
import { asArray, safeArrayLength, safeArrayMap } from "@/utils/reactQueryTypes";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Megaphone } from "lucide-react";

const CreateUpdateWizard = lazy(
  () => import("@/features/company-updates/wizard/CreateUpdateWizard"),
);

export default function CompanyUpdates() {
  const { t } = useTranslation();
  const bootstrap = useCommunicationBootstrap({
    includeInactiveEmployees: true,
  });
  const { can } = useCan();
  const { profile } = useProfile();
  const { toast } = useToast();
  const {
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
  } = useCompanyUpdateFilters();
  const {
    values: commentInputs,
    errors: commentErrors,
    handleChange: handleCommentInputChange,
    clearComment,
    setError: setCommentError,
  } = useCommentForm();
  const [visibleComments, setVisibleComments] = useState<
    Record<string, boolean>
  >({});
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<CompanyUpdate | null>(null);
  const publishingDue = useRef(new Set<string>());
  const canCreateUpdate = canManageCompanyUpdates({
    role: profile?.role,
    can: (key) => can(key),
  });

  const { updates, loading, error, pagination, refetch } = useCompanyUpdates({
    page,
    pageSize,
    status: canCreateUpdate ? ["published", "scheduled"] : "published",
    searchTerm,
  });
  const {
    recognitions: recognitionFeed,
    loading: recognitionLoading,
    error: recognitionError,
  } = useRecognitions();

  const safeUpdates = asArray(updates);
  const updateIds = useMemo(
    () => safeArrayMap(safeUpdates, (update) => update.id).filter(Boolean),
    [safeUpdates],
  );
  const { commentsByUpdate } = useCompanyUpdateComments(updateIds);
  const {
    createUpdate,
    archiveUpdate,
    deleteUpdate,
    publishUpdate,
    toggleLike,
    markAsViewed,
    addComment,
  } = useCompanyUpdateMutations();

  const recognitionHighlights = useMemo(
    () => (Array.isArray(recognitionFeed) ? recognitionFeed.slice(0, 3) : []),
    [recognitionFeed],
  );
  const updatesSchemaMissing = isMissingBackendResourceError(error, [
    "company_updates",
    "company_update",
  ]);
  const recognitionsSchemaMissing = isMissingBackendResourceError(
    recognitionError,
    ["recognitions"],
  );
  const moduleSchemaMissing = updatesSchemaMissing || recognitionsSchemaMissing;
  const isInitialLoading = loading && safeArrayLength(safeUpdates) === 0;
  const errorMessage =
    error && !updatesSchemaMissing
      ? companyUpdateLoadMessage(error, t("updates.pleaseTryAgain"))
      : null;
  const showUpdates = !moduleSchemaMissing && !errorMessage;
  const recognitionErrorMessage = recognitionsSchemaMissing
    ? null
    : recognitionError;
  const hasSearch = Boolean(searchTerm.trim());
  const totalPages = Math.max(1, Math.ceil((pagination.total ?? 0) / pageSize));
  const showPagination = !moduleSchemaMissing && totalPages > 1;
  useEffect(() => {
    setPage(1);
  }, [pageSize, searchTerm, viewMode, setPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages || 1);
    }
  }, [page, totalPages, setPage]);

  const openCreateWizard = useCallback(() => {
    setCreateWizardOpen(true);
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [setPage],
  );

  const handleUpdateComplete = useCallback(
    async (formData: WizardFormData) => {
      const publishNow = formData.publishingSettings.publishNow !== false;
      const authorName = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const scheduledDate = publishNow
        ? null
        : formData.publishingSettings.scheduledDate ?? null;
      await createUpdate({
        title: formData.title,
        body: formData.body,
        richContent: formData.richContent,
        type: formData.type,
        priority: formData.priority,
        backgroundStyle: formData.backgroundStyle,
        publishingSettings: formData.publishingSettings,
        recipients: { type: "all", targets: [] },
        isPinned: false,
        status: publishNow ? "published" : "scheduled",
        scheduledDate,
        publishDate: publishNow
          ? new Date().toISOString().slice(0, 10)
          : scheduledDate,
        author_id: profile?.id ?? profile?.userId ?? null,
        author_name: authorName || null,
        author_role: profile?.role ?? null,
        author_avatar: profile?.avatar_url ?? null,
      });
    },
    [createUpdate, profile],
  );

  const handleLike = useCallback(
    (updateId: string, currentlyLiked: boolean) => {
      toggleLike({ updateId, currentlyLiked });
    },
    [toggleLike],
  );

  const handleCommentSubmit = useCallback(
    async (update: CompanyUpdate) => {
      const content = commentInputs[update.id];
      if (!content?.trim()) {
        return;
      }

      try {
        await addComment({ updateId: update.id, content });
        clearComment(update.id);
      } catch (error) {
        const message = getErrorMessage(error, t("updates.unableToPostComment"));
        setCommentError(update.id, message);
        toast({
          title: t("updates.unableToPostComment"),
          description: message,
          variant: "destructive",
        });
      }
    },
    [addComment, commentInputs, clearComment, setCommentError, t, toast],
  );

  const handleToggleComments = useCallback((update: CompanyUpdate) => {
    setVisibleComments((prev) => ({ ...prev, [update.id]: !prev[update.id] }));
  }, []);

  const handleArchive = useCallback(
    (updateId: string) => {
      archiveUpdate(updateId)
        .then(() => {
          toast({
            title: t("updates.updateArchived"),
            description: t("updates.updateArchivedDescription"),
          });
        })
        .catch((archiveError) => {
          toast({
            title: t("updates.unableToArchive"),
            description: getErrorMessage(
              archiveError,
              t("updates.pleaseTryAgain"),
            ),
            variant: "destructive",
          });
        });
    },
    [archiveUpdate, t, toast],
  );

  const handleDelete = useCallback(
    (updateId: string) => {
      const confirmed = window.confirm(t("updates.deleteUpdateConfirm"));
      if (!confirmed) {
        return;
      }

      deleteUpdate(updateId)
        .then(() => {
          toast({
            title: t("updates.updateDeleted"),
            description: t("updates.updateDeletedDescription"),
          });
        })
        .catch((deleteError) => {
          toast({
            title: t("updates.unableToDelete"),
            description: getErrorMessage(
              deleteError,
              t("updates.pleaseTryAgain"),
            ),
            variant: "destructive",
          });
        });
    },
    [deleteUpdate, t, toast],
  );

  const handlePublish = useCallback(
    (updateId: string) => {
      publishUpdate(updateId)
        .then(() => {
          toast({
            title: t("updates.publishedNow"),
            description: t("updates.publishedNowDescription"),
          });
        })
        .catch(() => undefined);
    },
    [publishUpdate, t, toast],
  );

  const handleOpenComments = useCallback(
    (update: CompanyUpdate) => {
      setViewMode("feed");
      setVisibleComments((prev) => ({ ...prev, [update.id]: true }));
    },
    [setViewMode],
  );

  const getUpdateComments = useCallback(
    (updateId: string): UpdateComment[] => commentsByUpdate[updateId] ?? [],
    [commentsByUpdate],
  );

  useEffect(() => {
    if (!canCreateUpdate) return;
    for (const update of safeUpdates) {
      if (!isCompanyUpdateDue(update) || publishingDue.current.has(update.id)) {
        continue;
      }
      publishingDue.current.add(update.id);
      void publishUpdate(update.id).catch(() => undefined);
    }
  }, [canCreateUpdate, publishUpdate, safeUpdates]);

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text={t("updates.loadingCompanyUpdates")} />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("updates.unableToLoadWorkspace")}</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title={t("updates.workspaceDataIsStillLoading")}
          description={t("updates.workspaceUnlocks")}
          icon={<Megaphone className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col bg-muted/40">
      <CompanyUpdatesHeader
        canCreateUpdate={canCreateUpdate}
        onCreate={openCreateWizard}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        wizardOpen={createWizardOpen}
      />

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-background shadow-sm sm:mx-6">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {moduleSchemaMissing && (
            <CompanyUpdatesSetupState
              canCreate={canCreateUpdate}
              onCreate={openCreateWizard}
              wizardOpen={createWizardOpen}
            />
          )}

          {errorMessage && (
            <div className="px-4 pt-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("updates.unableToLoadUpdates")}</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{errorMessage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => void refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showUpdates && viewMode === "grid" && (
            <CompanyUpdatesGridSection
              updates={safeUpdates}
              loading={isInitialLoading}
              hasSearch={hasSearch}
              searchTerm={searchTerm}
              canCreateUpdate={canCreateUpdate}
              wizardOpen={createWizardOpen}
              onCreate={openCreateWizard}
              onLike={handleLike}
              onOpenComments={handleOpenComments}
              onEdit={setEditingUpdate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          )}

          {showUpdates && viewMode === "list" && (
            <CompanyUpdatesListSection
              updates={safeUpdates}
              loading={isInitialLoading}
              hasSearch={hasSearch}
              searchTerm={searchTerm}
              canCreateUpdate={canCreateUpdate}
              wizardOpen={createWizardOpen}
              onCreate={openCreateWizard}
              onLike={handleLike}
              onOpenComments={handleOpenComments}
              onEdit={setEditingUpdate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          )}

          {showUpdates && viewMode === "feed" && (
            <CompanyUpdatesFeedSection
              updates={safeUpdates}
              loading={isInitialLoading}
              recognitionLoading={recognitionLoading}
              recognitionHighlights={recognitionHighlights}
              recognitionError={recognitionErrorMessage}
              visibleComments={visibleComments}
              commentInputs={commentInputs}
              commentErrors={commentErrors}
              canCreateUpdate={canCreateUpdate}
              hasSearch={hasSearch}
              searchTerm={searchTerm}
              wizardOpen={createWizardOpen}
              getUpdateComments={getUpdateComments}
              onCreate={openCreateWizard}
              onCommentChange={handleCommentInputChange}
              onSubmitComment={handleCommentSubmit}
              onToggleComments={handleToggleComments}
              onLike={handleLike}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onEdit={setEditingUpdate}
              onPublish={handlePublish}
              onView={(updateId) => markAsViewed({ updateId })}
            />
          )}

          {showPagination && !isInitialLoading && (
            <div className="px-4 pb-6">
              <CompanyUpdatesPagination
                page={page}
                totalPages={totalPages}
                total={pagination.total ?? 0}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      </div>

      <EditUpdateDialog
        open={Boolean(editingUpdate)}
        onOpenChange={(open) => {
          if (!open) setEditingUpdate(null);
        }}
        update={editingUpdate}
      />

      <div id="company-updates-wizard">
        <Suspense fallback={<WizardFallback />}>
          <CreateUpdateWizard
            open={createWizardOpen}
            onOpenChange={setCreateWizardOpen}
            onComplete={handleUpdateComplete}
          />
        </Suspense>
      </div>
    </div>
  );
}
