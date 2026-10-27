import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  canCreate,
  onCreate,
  wizardOpen = false,
}: UpdatesEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Megaphone className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {hasSearch ? t("updates.noUpdatesFound") : t("updates.noUpdatesYet")}
      </h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        {hasSearch
          ? t("updates.nothingMatches", { search: searchTerm })
          : canCreate
            ? t("updates.shareWithTheTeam")
            : t("updates.noUpdatesStaff")}
      </p>
      {!hasSearch && canCreate ? (
        <Button
          className="mt-4"
          onClick={onCreate}
          aria-expanded={wizardOpen}
          aria-controls="company-updates-wizard"
        >
          {t("updates.newUpdate")}
        </Button>
      ) : null}
    </div>
  );
}
