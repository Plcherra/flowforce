import React, { useMemo, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCan } from '@/hooks/useCan';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useCompanyUpdates } from '@/hooks/useCompanyUpdates';
import { useRecognitions } from '@/hooks/useRecognitions';
import CreateUpdateWizard, { WizardFormData } from '@/components/updates/CreateUpdateWizard';
import { CompanyUpdatesHeader } from '@/features/company-updates/components/CompanyUpdatesHeader';
import { RecognitionHighlights } from '@/features/company-updates/components/RecognitionHighlights';
import { UpdateFeedCard } from '@/features/company-updates/components/UpdateFeedCard';
import { UpdateGridView } from '@/features/company-updates/components/UpdateGridView';
import { UpdateListView } from '@/features/company-updates/components/UpdateListView';
import { UpdatesEmptyState } from '@/features/company-updates/components/UpdatesEmptyState';
import type { CompanyUpdate, UpdateComment } from '@/types/companyUpdates';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

type ViewMode = 'feed' | 'grid' | 'list';

export default function CompanyUpdates() {
  const isMobile = useIsMobile();
  const { can } = useCan();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [visibleComments, setVisibleComments] = useState<Record<string, boolean>>({});
  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  const {
    updates,
    loading,
    error,
    commentsByUpdate,
    likeUpdate,
    addComment,
    markAsViewed,
    createUpdate,
    archiveUpdate,
    deleteUpdate,
  } = useCompanyUpdates();

  const { recognitions: recognitionFeed, loading: recognitionLoading } = useRecognitions();

  const filteredUpdates = useMemo(() => {
    return updates
      .filter((update) => update.status === 'published')
      .filter((update) => {
        if (!searchTerm.trim()) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
          update.title.toLowerCase().includes(lowerSearch) ||
          update.body.toLowerCase().includes(lowerSearch)
        );
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      });
  }, [searchTerm, updates]);

  const recognitionHighlights = useMemo(
    () => recognitionFeed.slice(0, 3),
    [recognitionFeed]
  );

  const isInitialLoading = loading && updates.length === 0;
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : (error as { message?: string }).message ?? 'Unable to load company updates.'
    : null;
  const hasSearch = Boolean(searchTerm.trim());

  const canCreateUpdate = useMemo(() => {
    if (can('systemSettings') || can('manageCompany')) {
      return true;
    }

    const role = (profile?.role || '').toLowerCase();
    return ['owner', 'company_admin', 'admin', 'manager'].includes(role);
  }, [can, profile?.role]);

  const handleUpdateComplete = useCallback((formData: WizardFormData) => {
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
  }, [createUpdate]);

  const handleLike = useCallback((updateId: string) => {
    likeUpdate(updateId);
  }, [likeUpdate]);

  const handleCommentSubmit = useCallback(async (update: CompanyUpdate) => {
    const content = commentInputs[update.id];
    if (!content?.trim()) {
      return;
    }

    await addComment(update.id, content);
    setCommentInputs((prev) => ({ ...prev, [update.id]: '' }));
  }, [addComment, commentInputs]);

  const handleToggleComments = useCallback((update: CompanyUpdate) => {
    setVisibleComments((prev) => ({ ...prev, [update.id]: !prev[update.id] }));
  }, []);

  const handleArchive = useCallback((updateId: string) => {
    archiveUpdate(updateId);
    toast({ title: 'Update archived', description: 'The update has been moved out of the feed.' });
  }, [archiveUpdate, toast]);

  const handleDelete = useCallback((updateId: string) => {
    const confirmed = window.confirm('Delete this update? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    deleteUpdate(updateId);
    toast({ title: 'Update deleted', description: 'The update has been removed permanently.' });
  }, [deleteUpdate, toast]);

  const getUpdateComments = useCallback(
    (updateId: string): UpdateComment[] => commentsByUpdate[updateId] ?? [],
    [commentsByUpdate]
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

      {viewMode === 'feed' && (
        <div className="px-4 py-6 space-y-4">
          <RecognitionHighlights loading={recognitionLoading} highlights={recognitionHighlights} />

          {isInitialLoading ? (
            <FeedSkeleton />
          ) : (
            <>
              {filteredUpdates.map((update) => (
                <UpdateFeedCard
                  key={update.id}
                  update={update}
                  comments={getUpdateComments(update.id)}
                  showComments={Boolean(visibleComments[update.id])}
                  commentValue={commentInputs[update.id] ?? ''}
                  onCommentChange={(id, value) => setCommentInputs((prev) => ({ ...prev, [id]: value }))}
                  onSubmitComment={handleCommentSubmit}
                  onToggleComments={handleToggleComments}
                  onLike={handleLike}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  canManage={canCreateUpdate}
                  onView={(id) => void markAsViewed(id)}
                  viewerHasViewed={update.viewerHasViewed}
                />
              ))}

              {filteredUpdates.length === 0 && (
                <UpdatesEmptyState
                  hasSearch={hasSearch}
                  searchTerm={searchTerm}
                  canCreate={canCreateUpdate}
                  onCreate={() => setCreateWizardOpen(true)}
                />
              )}
            </>
          )}
        </div>
      )}

      {viewMode === 'grid' && (
        <>
          {isInitialLoading ? (
            <GridSkeleton />
          ) : filteredUpdates.length > 0 ? (
            <UpdateGridView updates={filteredUpdates} />
          ) : (
            <div className="px-4 py-6">
              <UpdatesEmptyState
                hasSearch={hasSearch}
                searchTerm={searchTerm}
                canCreate={canCreateUpdate}
                onCreate={() => setCreateWizardOpen(true)}
              />
            </div>
          )}
        </>
      )}

      {viewMode === 'list' && (
        <>
          {isInitialLoading ? (
            <ListSkeleton />
          ) : filteredUpdates.length > 0 ? (
            <UpdateListView updates={filteredUpdates} />
          ) : (
            <div className="px-4 py-6">
              <UpdatesEmptyState
                hasSearch={hasSearch}
                searchTerm={searchTerm}
                canCreate={canCreateUpdate}
                onCreate={() => setCreateWizardOpen(true)}
              />
            </div>
          )}
        </>
      )}

      <CreateUpdateWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onComplete={handleUpdateComplete}
      />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
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
    <div className="px-4 py-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
    <div className="px-4 py-6">
      <div className="overflow-hidden rounded-lg border divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 items-center gap-4 px-6 py-4">
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
