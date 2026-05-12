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
  return (
    <FeatureSetupRequiredState
      title="Company Updates module is not fully set up yet"
      description="The app is running, but the database tables for company updates and recognitions have not been created in this Supabase project yet."
      icon={<Megaphone className="h-5 w-5" />}
      action={
        canCreate ? (
          <Button
            onClick={onCreate}
            aria-expanded={wizardOpen}
            aria-controls="company-updates-wizard"
          >
            Open create wizard
          </Button>
        ) : undefined
      }
      setupDescription={
        <>
          Missing tables: <code>company_updates</code> and/or{" "}
          <code>recognitions</code>. Once those migrations are restored, this
          page will automatically show the update feed.
        </>
      }
    />
  );
}
