import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useCompanyUpdates } from "@/hooks/useCompanyUpdates";
import { useRecognitions } from "@/hooks/useRecognitions";
import type { WizardFormData } from "@/components/updates/CreateUpdateWizard";
import { CompanyUpdatesHeader } from "@/features/company-updates/components/CompanyUpdatesHeader";
import { RecognitionHighlights } from "@/features/company-updates/components/RecognitionHighlights";
import { UpdateFeedCard } from "@/features/company-updates/components/UpdateFeedCard";
import { UpdateGridView } from "@/features/company-updates/components/UpdateGridView";
import { UpdateListView } from "@/features/company-updates/components/UpdateListView";
import { UpdatesEmptyState } from "@/features/company-updates/components/UpdatesEmptyState";
import type { CompanyUpdate, UpdateComment } from "@/types/companyUpdates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useCommentForm } from "@/features/company-updates/hooks/useCommentForm";
import { getErrorMessage } from "@/shared/utils";
import { useCompanyUpdateFilters } from "@/features/company-updates/hooks/useCompanyUpdateFilters";
import { useCompanyUpdateComments } from "@/features/company-updates/hooks/useCompanyUpdateComments";
import { useCompanyUpdateMutations } from "@/features/company-updates/hooks/useCompanyUpdateMutations";
import {
  asArray,
  safeArrayLength,
  safeArrayMap,
} from "@/utils/reactQueryTypes";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { PageLoader } from "@/components/common/PageLoader";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { Megaphone } from "lucide-react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const CreateUpdateWizard = lazy(
  () => import("@/components/updates/CreateUpdateWizard"),
);

export default function CompanyUpdates() {
  // All hooks must be called before any conditional returns
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

  // Ensure updates is an array
  const safeUpdates = asArray(updates);

  // Compute updateIds with safe fallback
  const updateIds = useMemo(() => {
    if (safeArrayLength(safeUpdates) === 0) {
      return [];
    }
    return safeArrayMap(safeUpdates, (update) => update.id).filter(Boolean);
  }, [safeUpdates]);

  // All hooks must be called unconditionally before any early returns
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

  // Early returns after all hooks
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

  const isInitialLoading = loading && safeArrayLength(safeUpdates) === 0;
  const errorMessage = error
    ? getErrorMessage(error, "Unable to load company updates.")
    : null;
  const hasSearch = Boolean(searchTerm.trim());
  const totalPages = Math.max(1, Math.ceil((pagination.total ?? 0) / pageSize));
  const showPagination = totalPages > 1;

  useEffect(() => {
    setPage(1);
  }, [pageSize, searchTerm, viewMode, setPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages || 1);
    }
  }, [page, totalPages, setPage]);

  const canCreateUpdate = useMemo(() => {
    if (can("systemSettings") || can("manageCompany")) {
      return true;
    }

    const role = (profile?.role || "").toLowerCase();
    return ["owner", "company_admin", "admin", "manager"].includes(role);
  }, [can, profile?.role]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [setPage],
  );

  const handlePageSizeChange = useCallback(
    (nextSize: number) => {
      setPageSize(nextSize);
    },
    [setPageSize],
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

  const handleMarkAsViewed = useCallback(
    (updateId: string) => {
      markAsViewed({ updateId });
    },
    [markAsViewed],
  );

  const handleCommentChange = useCallback(
    (id: string, value: string) => {
      handleCommentInputChange(id, value);
    },
    [handleCommentInputChange],
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

  return (
    <div className="min-h-screen bg-background">
      <CompanyUpdatesHeader
        isMobile={isMobile}
        canCreateUpdate={canCreateUpdate}
        onCreate={() => setCreateWizardOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        wizardOpen={createWizardOpen}
      />

      {errorMessage && (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load updates</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {viewMode === "feed" && (
        <div className="px-4 py-6 space-y-4">
          <RecognitionHighlights
            loading={recognitionLoading}
            highlights={recognitionHighlights}
            error={recognitionError}
          />

          {isInitialLoading ? (
            <FeedSkeleton />
          ) : (
            <>
              {safeArrayMap(safeUpdates, (update) => (
                <UpdateFeedCard
                  key={update.id}
                  update={update}
                  comments={getUpdateComments(update.id)}
                  showComments={Boolean(visibleComments[update.id])}
                  commentValue={commentInputs[update.id] ?? ""}
                  onCommentChange={handleCommentChange}
                  onSubmitComment={handleCommentSubmit}
                  onToggleComments={handleToggleComments}
                  onLike={(id) => handleLike(id, update.viewerHasLiked)}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  canManage={canCreateUpdate}
                  onView={handleMarkAsViewed}
                  viewerHasViewed={update.viewerHasViewed}
                  commentError={commentErrors[update.id]}
                />
              ))}

              {safeArrayLength(safeUpdates) === 0 && (
                <UpdatesEmptyState
                  hasSearch={hasSearch}
                  searchTerm={searchTerm}
                  canCreate={canCreateUpdate}
                  onCreate={() => setCreateWizardOpen(true)}
                  wizardOpen={createWizardOpen}
                />
              )}
            </>
          )}
        </div>
      )}

      {viewMode === "grid" && (
        <>
          {isInitialLoading ? (
            <GridSkeleton />
          ) : safeArrayLength(safeUpdates) > 0 ? (
            <UpdateGridView updates={safeUpdates} />
          ) : (
            <div className="px-4 py-6">
              <UpdatesEmptyState
                hasSearch={hasSearch}
                searchTerm={searchTerm}
                canCreate={canCreateUpdate}
                onCreate={() => setCreateWizardOpen(true)}
                wizardOpen={createWizardOpen}
              />
            </div>
          )}
        </>
      )}

      {viewMode === "list" && (
        <>
          {isInitialLoading ? (
            <ListSkeleton />
          ) : safeArrayLength(safeUpdates) > 0 ? (
            <UpdateListView updates={safeUpdates} />
          ) : (
            <div className="px-4 py-6">
              <UpdatesEmptyState
                hasSearch={hasSearch}
                searchTerm={searchTerm}
                canCreate={canCreateUpdate}
                onCreate={() => setCreateWizardOpen(true)}
                wizardOpen={createWizardOpen}
              />
            </div>
          )}
        </>
      )}

      {showPagination && !isInitialLoading && (
        <div className="px-4 pb-6">
          <UpdatesPagination
            page={page}
            totalPages={totalPages}
            total={pagination.total ?? 0}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
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

function FeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="px-4 py-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="px-4 py-6 animate-pulse">
      <div className="overflow-hidden rounded-lg border divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-5 items-center gap-4 px-6 py-4"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardFallback() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

type UpdatesPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function UpdatesPagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: UpdatesPaginationProps) {
  const pageNumbers = getPaginationSequence(page, totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="rounded-lg border bg-card px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {from === 0 ? 0 : from}-{to} of {total} updates
        </p>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span>Per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination className="ml-auto w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pageNumbers.map((value, index) =>
                value === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={value}>
                    <PaginationLink
                      isActive={value === page}
                      onClick={() => onPageChange(value)}
                    >
                      {value}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  aria-disabled={page === totalPages}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

function getPaginationSequence(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, "ellipsis", total];
  }

  if (current >= total - 2) {
    return [1, "ellipsis", total - 2, total - 1, total];
  }

  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}
