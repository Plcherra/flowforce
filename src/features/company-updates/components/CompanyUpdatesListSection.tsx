import { UpdateListView } from "@/features/company-updates/components/UpdateListView";
import { UpdatesEmptyState } from "@/features/company-updates/components/UpdatesEmptyState";
import { ListSkeleton } from "@/features/company-updates/components/CompanyUpdatesSkeletons";
import type { CompanyUpdate } from "@/types/companyUpdates";
import { safeArrayLength } from "@/utils/reactQueryTypes";

interface CompanyUpdatesListSectionProps {
  updates: CompanyUpdate[];
  loading: boolean;
  hasSearch: boolean;
  searchTerm: string;
  canCreateUpdate: boolean;
  wizardOpen: boolean;
  onCreate: () => void;
}

export function CompanyUpdatesListSection({
  updates,
  loading,
  hasSearch,
  searchTerm,
  canCreateUpdate,
  wizardOpen,
  onCreate,
}: CompanyUpdatesListSectionProps) {
  if (loading) {
    return <ListSkeleton />;
  }

  if (safeArrayLength(updates) > 0) {
    return <UpdateListView updates={updates} />;
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
