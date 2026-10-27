import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyUpdateViewMode } from "@/features/company-updates/companyUpdateAccess";
import { COMPANY_UPDATE_VIEW_MODES } from "@/features/company-updates/companyUpdateAccess";

interface CompanyUpdatesHeaderProps {
  canCreateUpdate: boolean;
  onCreate: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: CompanyUpdateViewMode;
  onViewModeChange: (mode: CompanyUpdateViewMode) => void;
  wizardOpen?: boolean;
}

export function CompanyUpdatesHeader({
  canCreateUpdate,
  onCreate,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  wizardOpen = false,
}: CompanyUpdatesHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
      <div className="mr-auto">
        <h1 className="text-xl font-semibold">{t("updates.updates")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("updates.newsAndAnnouncementsForTheTeam")} </p>
      </div>
      <div
        className="flex w-full gap-1 sm:w-auto"
        role="group"
        aria-label={t("updates.viewAs")}
      >
        {COMPANY_UPDATE_VIEW_MODES.map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            className="h-9 flex-1 sm:flex-none"
            variant={viewMode === mode ? "default" : "outline"}
            aria-pressed={viewMode === mode}
            onClick={() => onViewModeChange(mode)}
          >
            {t(`updates.${mode}`)}
          </Button>
        ))}
      </div>
      <div className="w-full sm:w-56">
        <Label htmlFor="company-updates-search" className="sr-only">
          {t("updates.searchUpdates")}
        </Label>
        <Input
          id="company-updates-search"
          placeholder={t("updates.searchUpdates")}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {canCreateUpdate && (
        <Button
          variant={wizardOpen ? "default" : "outline"}
          onClick={onCreate}
          aria-expanded={wizardOpen}
          aria-controls="company-updates-wizard"
        >
          {t("updates.newUpdate")} </Button>
      )}
    </div>
  );
}
