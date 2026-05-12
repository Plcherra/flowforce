import { RecognitionHighlights } from "@/features/company-updates/components/RecognitionHighlights";
import { UpdateFeedCard } from "@/features/company-updates/components/UpdateFeedCard";
import { UpdatesEmptyState } from "@/features/company-updates/components/UpdatesEmptyState";
import { FeedSkeleton } from "@/features/company-updates/components/CompanyUpdatesSkeletons";
import type { CompanyUpdate, UpdateComment } from "@/types/companyUpdates";
import type { RecognitionRecord } from "@/types/recognition";
import { safeArrayLength, safeArrayMap } from "@/utils/reactQueryTypes";

interface CompanyUpdatesFeedSectionProps {
  updates: CompanyUpdate[];
  loading: boolean;
  recognitionLoading: boolean;
  recognitionHighlights: RecognitionRecord[];
  recognitionError: string | null | undefined;
  visibleComments: Record<string, boolean>;
  commentInputs: Record<string, string>;
  commentErrors: Record<string, string | undefined>;
  canCreateUpdate: boolean;
  hasSearch: boolean;
  searchTerm: string;
  wizardOpen: boolean;
  getUpdateComments: (updateId: string) => UpdateComment[];
  onCreate: () => void;
  onCommentChange: (id: string, value: string) => void;
  onSubmitComment: (update: CompanyUpdate) => void | Promise<void>;
  onToggleComments: (update: CompanyUpdate) => void;
  onLike: (updateId: string, currentlyLiked: boolean) => void;
  onArchive: (updateId: string) => void;
  onDelete: (updateId: string) => void;
  onView: (updateId: string) => void;
}

export function CompanyUpdatesFeedSection({
  updates,
  loading,
  recognitionLoading,
  recognitionHighlights,
  recognitionError,
  visibleComments,
  commentInputs,
  commentErrors,
  canCreateUpdate,
  hasSearch,
  searchTerm,
  wizardOpen,
  getUpdateComments,
  onCreate,
  onCommentChange,
  onSubmitComment,
  onToggleComments,
  onLike,
  onArchive,
  onDelete,
  onView,
}: CompanyUpdatesFeedSectionProps) {
  return (
    <div className="px-4 py-6 space-y-4">
      <RecognitionHighlights
        loading={recognitionLoading}
        highlights={recognitionHighlights}
        error={recognitionError}
      />

      {loading ? (
        <FeedSkeleton />
      ) : (
        <>
          {safeArrayMap(updates, (update) => (
            <UpdateFeedCard
              key={update.id}
              update={update}
              comments={getUpdateComments(update.id)}
              showComments={Boolean(visibleComments[update.id])}
              commentValue={commentInputs[update.id] ?? ""}
              onCommentChange={onCommentChange}
              onSubmitComment={onSubmitComment}
              onToggleComments={onToggleComments}
              onLike={(id) => onLike(id, update.viewerHasLiked)}
              onArchive={onArchive}
              onDelete={onDelete}
              canManage={canCreateUpdate}
              onView={onView}
              viewerHasViewed={update.viewerHasViewed}
              commentError={commentErrors[update.id]}
            />
          ))}

          {safeArrayLength(updates) === 0 && (
            <UpdatesEmptyState
              hasSearch={hasSearch}
              searchTerm={searchTerm}
              canCreate={canCreateUpdate}
              onCreate={onCreate}
              wizardOpen={wizardOpen}
            />
          )}
        </>
      )}
    </div>
  );
}
