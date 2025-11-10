import React from 'react';
import { Button } from '@/components/ui/button';

interface UpdatesEmptyStateProps {
  hasSearch: boolean;
  searchTerm: string;
  canCreate: boolean;
  onCreate: () => void;
  wizardOpen?: boolean;
}

export function UpdatesEmptyState({ hasSearch, searchTerm, canCreate, onCreate, wizardOpen = false }: UpdatesEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📢</span>
      </div>
      <h3 className="text-lg font-medium mb-2">
        {hasSearch ? 'No updates found' : 'No Updates Yet'}
      </h3>
      <p className="text-muted-foreground text-sm">
        {hasSearch
          ? `No updates match "${searchTerm}"`
          : 'Company updates and announcements will appear here.'}
      </p>
      {!hasSearch && canCreate && (
        <Button className="mt-6" onClick={onCreate} aria-expanded={wizardOpen} aria-controls="company-updates-wizard">
          Create your first update
        </Button>
      )}
    </div>
  );
}
