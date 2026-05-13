import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { PageLoader } from "@/components/common/PageLoader";
import { CompanyUpdatesFeedSection } from "@/features/company-updates/components/CompanyUpdatesFeedSection";
import { CompanyUpdatesGridSection } from "@/features/company-updates/components/CompanyUpdatesGridSection";
import { CompanyUpdatesHeader } from "@/features/company-updates/components/CompanyUpdatesHeader";
import { CompanyUpdatesListSection } from "@/features/company-updates/components/CompanyUpdatesListSection";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useRecognitions } from "@/hooks/useRecognitions";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/shared/utils";
import { isMissingBackendResourceError } from "@/shared/utils/supabaseErrors";
import type { CompanyUpdate, UpdateComment } from "@/types/companyUpdates";
import type { WizardFormData } from "@/features/company-updates/wizard/CreateUpdateWizard";
import { asArray, safeArrayLength, safeArrayMap } from "@/utils/reactQueryTypes";
import { AlertTriangle, Megaphone } from "lucide-react";

const CreateUpdateWizard = lazy(
  () => import("@/features/company-updates/wizard/CreateUpdateWizard"),
);

export default function CompanyUpdates() {
  const bootstrap = useCommunicationBootstrap({
    includeInactiveEmployees: true,
  });
  const isMobile = useIsMobile();
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

  const { updates, loading, error, pagination } = useCompanyUpdates({
    page,
    pageSize,
    status: "published",
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
      ? getErrorMessage(error, "Unable to load company updates.")
      : null;
  const recognitionErrorMessage = recognitionsSchemaMissing
    ? null
    : recognitionError;
  const hasSearch = Boolean(searchTerm.trim());
  const totalPages = Math.max(1, Math.ceil((pagination.total ?? 0) / pageSize));
  const showPagination = !moduleSchemaMissing && totalPages > 1;
  const canCreateUpdate = useMemo(() => {
    if (can("systemSettings") || can("admin.settings")) {
      return true;
    }

    const role = (profile?.role || "").toLowerCase();
    return ["owner", "company_admin", "admin", "manager"].includes(role);
  }, [can, profile?.role]);

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
    (formData: WizardFormData) => {
      void createUpdate({
        title: formData.title,
        body: formData.body,
        richContent: formData.richContent,
        type: formData.type,
        priority: formData.priority,
        backgroundStyle: formData.backgroundStyle,
        publishingSettings: formData.publishingSettings,
        recipients: formData.recipients,
        isPinned: false,
      });
    },
    [createUpdate],
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
        const message = getErrorMessage(error, "Unable to post comment.");
        setCommentError(update.id, message);
        toast({
          title: "Unable to post comment",
          description: message,
          variant: "destructive",
        });
      }
    },
    [addComment, commentInputs, clearComment, setCommentError, toast],
  );

  const handleToggleComments = useCallback((update: CompanyUpdate) => {
    setVisibleComments((prev) => ({ ...prev, [update.id]: !prev[update.id] }));
  }, []);

  const handleArchive = useCallback(
    (updateId: string) => {
      archiveUpdate(updateId).then(() => {
        toast({
          title: "Update archived",
          description: "The update has been moved out of the feed.",
        });
      });
    },
    [archiveUpdate, toast],
  );

  const handleDelete = useCallback(
    (updateId: string) => {
      const confirmed = window.confirm(
        "Delete this update? This action cannot be undone.",
      );
      if (!confirmed) {
        return;
      }

      deleteUpdate(updateId).then(() => {
        toast({
          title: "Update deleted",
          description: "The update has been removed permanently.",
        });
      });
    },
    [deleteUpdate, toast],
  );

  const getUpdateComments = useCallback(
    (updateId: string): UpdateComment[] => commentsByUpdate[updateId] ?? [],
    [commentsByUpdate],
  );

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading company updates..." />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load workspace</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Workspace data is still loading"
          description="Company updates unlock once we have your organization and employee information."
          icon={<Megaphone className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CompanyUpdatesHeader
        isMobile={isMobile}
        canCreateUpdate={canCreateUpdate}
        onCreate={openCreateWizard}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        wizardOpen={createWizardOpen}
      />

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
            <AlertTitle>Unable to load updates</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {!moduleSchemaMissing && viewMode === "feed" && (
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
          onView={(updateId) => markAsViewed({ updateId })}
        />
      )}

      {!moduleSchemaMissing && viewMode === "grid" && (
        <CompanyUpdatesGridSection
          updates={safeUpdates}
          loading={isInitialLoading}
          hasSearch={hasSearch}
          searchTerm={searchTerm}
          canCreateUpdate={canCreateUpdate}
          wizardOpen={createWizardOpen}
          onCreate={openCreateWizard}
        />
      )}

      {!moduleSchemaMissing && viewMode === "list" && (
        <CompanyUpdatesListSection
          updates={safeUpdates}
          loading={isInitialLoading}
          hasSearch={hasSearch}
          searchTerm={searchTerm}
          canCreateUpdate={canCreateUpdate}
          wizardOpen={createWizardOpen}
          onCreate={openCreateWizard}
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
