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
import type { CompanyUpdate } from '@/types/companyUpdates';
import type { UpdateComment } from '@/types/companyUpdates';
import { LoadingSpinner } from '@/components/ui/loading-states';

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
    comments,
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
          update.content.toLowerCase().includes(lowerSearch)
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

  const canCreateUpdate = useMemo(() => {
    if (can('systemSettings') || can('manageCompany')) {
      return true;
    }

    const role = (profile?.role || '').toLowerCase();
    return ['owner', 'company_admin', 'admin', 'manager'].includes(role);
  }, [can, profile?.role]);

  const handleUpdateComplete = useCallback((formData: WizardFormData) => {
    createUpdate({
      title: formData.title,
      content: formData.content,
      richContent: formData.richContent,
      type: formData.type,
      priority: formData.priority,
      backgroundStyle: formData.backgroundStyle,
      publishingSettings: formData.publishingSettings,
      recipients: formData.recipients,
      isPinned: false,
    });
  }, [createUpdate]);

  const handleLike = useCallback((update: CompanyUpdate) => {
    likeUpdate(update.id);
  }, [likeUpdate]);

  const handleCommentSubmit = useCallback((update: CompanyUpdate) => {
    const content = commentInputs[update.id];
    if (!content?.trim()) {
      return;
    }

    addComment(update.id, content);
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
    (updateId: string): UpdateComment[] => comments.filter((comment) => comment.updateId === updateId),
    [comments]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading updates..." />
      </div>
    );
  }

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

      {viewMode === 'feed' && (
        <div className="px-4 py-6 space-y-4">
          <RecognitionHighlights loading={recognitionLoading} highlights={recognitionHighlights} />

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
              markAsViewed={markAsViewed}
            />
          ))}

          {filteredUpdates.length === 0 && (
            <UpdatesEmptyState
              hasSearch={Boolean(searchTerm)}
              searchTerm={searchTerm}
              canCreate={canCreateUpdate}
              onCreate={() => setCreateWizardOpen(true)}
            />
          )}
        </div>
      )}

      {viewMode === 'grid' && <UpdateGridView updates={filteredUpdates} />}

      {viewMode === 'list' && <UpdateListView updates={filteredUpdates} />}

      <CreateUpdateWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onComplete={handleUpdateComplete}
      />
    </div>
  );
}
