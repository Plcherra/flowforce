
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { useCan } from '@/hooks/useCan';
import { logger } from '@/utils/logger';
import { useCompanyUpdates } from '@/hooks/useCompanyUpdates';
import { UpdatesTableView } from './updates/UpdatesTableView';
import { UpdatesFeedView } from './updates/UpdatesFeedView';
import type { CompanyUpdate } from '@/types/companyUpdates';

export default function CompanyUpdatesSection() {
  const { can } = useCan();
  const [viewMode, setViewMode] = useState<'table' | 'feed'>('table');
  const { 
    updates, 
    loading, 
    comments, 
    likeUpdate, 
    addComment, 
    markAsViewed, 
    togglePin, 
    deleteUpdate 
  } = useCompanyUpdates();

  const handleAddNew = () => {
    // TODO: Open create update dialog
    logger.debug('Add new update');
  };

  const handleEdit = (update: CompanyUpdate) => {
    // TODO: Open edit update dialog
    logger.debug('Edit update:', update);
  };

  const handleView = (updateId: string) => {
    void markAsViewed(updateId);
  };

  const handleLike = (updateId: string) => {
    void likeUpdate(updateId);
  };

  const handleComment = async (updateId: string, content: string) => {
    await addComment(updateId, content);
  };

  const handleTogglePin = (updateId: string) => {
    void togglePin(updateId);
  };

  const handleDelete = (updateId: string) => {
    void deleteUpdate(updateId);
  };

  if (loading) {
    return (
      <div>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading updates...</div>
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
                  <h1 className="text-2xl font-bold text-foreground">Company Updates</h1>
                  <p className="text-muted-foreground mt-1">
                    Stay informed with the latest company news and announcements
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Toggle */}
                <div className="flex items-center border border-border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'feed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('feed')}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>

                {can('systemSettings') && (
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Update
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
          viewMode === 'feed' ? 'max-w-4xl' : 'max-w-7xl'
        }`}>
          {viewMode === 'table' ? (
            <UpdatesTableView
              updates={updates}
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
    </div>
  );
}
