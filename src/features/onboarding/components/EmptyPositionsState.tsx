import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";

export default function EmptyPositionsState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>{t("onboarding.noPositionsAddedYet")}</p>
      <p className="text-xs">{t("onboarding.addPositionsToOrganizeYourTeamStructure")}</p>
    </div>
  );
}
