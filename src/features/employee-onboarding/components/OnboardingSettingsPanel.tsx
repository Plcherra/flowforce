import { useTranslation } from "react-i18next";
import { OnboardingSettingsView } from "./OnboardingSettingsView";
import { useOnboardingSettings } from "../useOnboardingSettings";

export default function OnboardingSettingsPanel() {
  const { t } = useTranslation();
  const settings = useOnboardingSettings();

  if (settings.load.kind === "loading") {
    return <p className="text-sm text-muted-foreground">{t("employeeOnboarding.loading")}</p>;
  }
  if (settings.load.kind === "missing") {
    return <p className="text-sm text-muted-foreground">{t("employeeOnboarding.missingSchema")}</p>;
  }
  if (settings.load.kind === "error") {
    return <p className="text-sm text-muted-foreground">{t("employeeOnboarding.loadError")}</p>;
  }

  const data = settings.load.settings;
  return (
    <OnboardingSettingsView
      welcomeTitle={data.welcomeTitle}
      welcomeBody={data.welcomeBody}
      documents={data.documents}
      steps={data.steps}
      submissions={data.submissions}
      canManageSteps={settings.canManageSteps}
      canManageDocuments={settings.canManageDocuments}
      busy={settings.busy}
      onSaveWelcome={(title, body) => {
        void settings.saveWelcome(title, body);
      }}
      onUploadDocument={(title, file) => {
        void settings.uploadDocument(title, file);
      }}
      onArchiveDocument={(id) => {
        void settings.archiveDocument(id);
      }}
      onOpenDocument={(document) => {
        void settings.openDocument(document);
      }}
      onCreateStep={(input) => {
        void settings.createStep(input);
      }}
      onArchiveStep={(id) => {
        void settings.archiveStep(id);
      }}
      onMoveStep={(id, direction) => {
        void settings.moveStep(id, direction);
      }}
      onOpenSubmission={(submission) => {
        void settings.openSubmission(submission);
      }}
    />
  );
}
