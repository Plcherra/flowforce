import React from "react";

interface UpdatesEmptyStateProps {
  hasSearch: boolean;
  searchTerm: string;
  canCreate: boolean;
  onCreate: () => void;
  wizardOpen?: boolean;
}

export function UpdatesEmptyState({
  hasSearch,
  searchTerm,
}: UpdatesEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <h3 className="mb-2 text-lg font-semibold">
        {hasSearch ? "No updates found" : "No updates yet"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {hasSearch
          ? `Nothing matches "${searchTerm}".`
          : "Use New update to share something with the team."}
      </p>
    </div>
  );
}
