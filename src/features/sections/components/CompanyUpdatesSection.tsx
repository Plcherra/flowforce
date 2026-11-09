import { useTranslation } from "react-i18next";
import React, { lazy, Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { canManageCompanyUpdates } from "@/features/company-updates/companyUpdateAccess";
import { WizardFallback } from "@/features/company-updates/components/CompanyUpdatesSkeletons";
import { useCompanyUpdates } from "@/hooks/useCompanyUpdates";
import { useCompanyUpdateComments } from "@/features/company-updates/hooks/useCompanyUpdateComments";
import { useCompanyUpdateMutations } from "@/features/company-updates/hooks/useCompanyUpdateMutations";
import { UpdatesTableView } from "./updates/UpdatesTableView";
import { UpdatesFeedView } from "./updates/UpdatesFeedView";
import { EditUpdateDialog } from "@/features/company-updates/components/EditUpdateDialog";
import type { CompanyUpdate } from "@/types/companyUpdates";
import type { WizardFormData } from "@/features/company-updates/wizard/CreateUpdateWizard";

const CreateUpdateWizard = lazy(
  () => import("@/features/company-updates/wizard/CreateUpdateWizard"),
);

export default function CompanyUpdatesSection() {
  const { t } = useTranslation();
  const { can } = useCan();
  const { profile } = useProfile();
  const canManageUpdates = canManageCompanyUpdates({
    role: profile?.role,
    can: (key) => can(key),
  });
  const [viewMode, setViewMode] = useState<"table" | "feed">("table");
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<CompanyUpdate | null>(
    null,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { updates, loading } = useCompanyUpdates();
  const { commentsByUpdate } = useCompanyUpdateComments(
    updates.map((update) => update.id),
  );
  const comments = useMemo(
    () => Object.values(commentsByUpdate).flat(),
    [commentsByUpdate],
  );
  const { toggleLike, addComment, markAsViewed, togglePin, deleteUpdate, createUpdate } =
    useCompanyUpdateMutations();

  const handleAddNew = () => {
    setCreateWizardOpen(true);
  };

  const handleUpdateComplete = (formData: WizardFormData) => {
    void createUpdate({
      title: formData.title,
      body: formData.body,
      richContent: formData.richContent,
      type: formData.type,
      priority: formData.priority,
      isPinned: false,
    });
  };

  const handleEdit = (update: CompanyUpdate) => {
    setEditingUpdate(update);
    setEditDialogOpen(true);
  };

  const handleView = (updateId: string) => {
    markAsViewed({ updateId });
  };

  const handleLike = (updateId: string) => {
    const update = updates.find((item) => item.id === updateId);
    if (!update) return;
    void toggleLike({ updateId, currentlyLiked: update.viewerHasLiked });
  };

  const handleComment = async (updateId: string, content: string) => {
    await addComment({ updateId, content });
  };

  const handleTogglePin = (updateId: string) => {
    const update = updates.find((item) => item.id === updateId);
    void togglePin({ updateId, isPinned: update ? !update.isPinned : true });
  };

  const handleDelete = (updateId: string) => {
    void deleteUpdate(updateId);
  };

  if (loading) {
    return (
      <div>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">{t("sections.loadingUpdates")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <span className="text-2xl">📢</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {t("common.companyUpdates")}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {t("sections.stayInformedWithTheLatestCompanyNewsAndAnnouncements")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* View Toggle */}
                <div className="flex items-center border border-border rounded-lg p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "feed" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("feed")}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>

                {canManageUpdates && (
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("sections.newUpdate")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
            viewMode === "feed" ? "max-w-4xl" : "max-w-7xl"
          }`}
        >
          {viewMode === "table" ? (
            <UpdatesTableView
              updates={updates}
              canManage={canManageUpdates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onAddNew={handleAddNew}
            />
          ) : (
            <UpdatesFeedView
              updates={updates}
              comments={comments}
              onLike={handleLike}
              onComment={handleComment}
              onView={handleView}
              loading={loading}
            />
          )}
        </div>
      </div>

      <EditUpdateDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingUpdate(null);
          }
        }}
        update={editingUpdate}
        onUpdateComplete={() => {
          setEditDialogOpen(false);
          setEditingUpdate(null);
        }}
      />

      <div id="company-updates-section-wizard">
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
