import { UpdateGridView } from "@/features/company-updates/components/UpdateGridView";
import { UpdatesEmptyState } from "@/features/company-updates/components/UpdatesEmptyState";
import { GridSkeleton } from "@/features/company-updates/components/CompanyUpdatesSkeletons";
import type { CompanyUpdate } from "@/types/companyUpdates";
import { safeArrayLength } from "@/utils/reactQueryTypes";

interface CompanyUpdatesGridSectionProps {
  updates: CompanyUpdate[];
  loading: boolean;
  hasSearch: boolean;
  searchTerm: string;
  canCreateUpdate: boolean;
  wizardOpen: boolean;
  onCreate: () => void;
}

export function CompanyUpdatesGridSection({
  updates,
  loading,
  hasSearch,
  searchTerm,
  canCreateUpdate,
  wizardOpen,
  onCreate,
}: CompanyUpdatesGridSectionProps) {
  if (loading) {
    return <GridSkeleton />;
  }

  if (safeArrayLength(updates) > 0) {
    return <UpdateGridView updates={updates} />;
  }

  return (
    <div className="px-4 py-6">
      <UpdatesEmptyState
        hasSearch={hasSearch}
        searchTerm={searchTerm}
        canCreate={canCreateUpdate}
        onCreate={onCreate}
        wizardOpen={wizardOpen}
      />
    </div>
  );
}
