import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import { Megaphone } from "lucide-react";

interface CompanyUpdatesSetupStateProps {
  canCreate: boolean;
  onCreate: () => void;
  wizardOpen: boolean;
}

export function CompanyUpdatesSetupState({
  canCreate,
  onCreate,
  wizardOpen,
}: CompanyUpdatesSetupStateProps) {
  const { t } = useTranslation();
  return (
    <FeatureSetupRequiredState
      title={t("updates.companyUpdatesModuleIsNotFullySetUpYet")}
      description="The app is running, but the database tables for company updates and recognitions have not been created in this Supabase project yet."
      icon={<Megaphone className="h-5 w-5" />}
      action={
        canCreate ? (
          <Button
            onClick={onCreate}
            aria-expanded={wizardOpen}
            aria-controls="company-updates-wizard"
          >
            {t("updates.openCreateWizard")} </Button>
        ) : undefined
      }
      setupDescription={
        <>
          {t("updates.missingTables")} <code>{t("updates.companyUpdates")}</code> {t("updates.andOr")}{" "}
          <code>{t("updates.recognitions")}</code>{t("updates.onceThoseMigrationsAreRestoredThisPageWillAutomaticallyShowTheUpdateFeed")} </>
      }
    />
  );
}
