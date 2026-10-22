import { useTranslation } from "react-i18next";
export function GettingStartedSection() {
  const { t } = useTranslation();
  return (
    <>
      <h3 className="mt-8">{t("resources.gettingStarted")}</h3>
      <div className="bg-muted border rounded-lg p-6 mt-4">
        <ol className="space-y-3">
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-foreground text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <span>{t("resources.chooseYourIntegrationFromTheDetailedGuidesAbove")}</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-foreground text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <span>{t("resources.followTheStepByStepSetupInstructions")}</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-foreground text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <span>{t("resources.testYourConnectionWithSampleData")}</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-foreground text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              4
            </span>
            <span>{t("resources.configureSyncSettingsAndGoLive")}</span>
          </li>
        </ol>
      </div>
    </>
  );
}
