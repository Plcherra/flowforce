import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router-adapter";
import { EmployeeOnboardingView } from "./EmployeeOnboardingView";
import { useEmployeeOnboarding } from "../useEmployeeOnboarding";

export function EmployeeOnboardingPage() {
  const { t } = useTranslation();
  const screen = useEmployeeOnboarding();

  if (screen.state.kind === "loading") {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{t("employeeOnboarding.loading")}</p>;
  }
  if (screen.state.kind === "missing") {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{t("employeeOnboarding.missingSchema")}</p>;
  }
  if (screen.state.kind === "error") {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{t("employeeOnboarding.loadError")}</p>;
  }
  if (screen.state.kind === "none") {
    return (
      <div className="space-y-3 px-4 py-6">
        <p className="text-sm text-muted-foreground">{t("employeeOnboarding.notEnrolled")}</p>
        <Link className="text-sm text-primary underline" to="/app/dashboard">
          {t("employeeOnboarding.backToOverview")}
        </Link>
      </div>
    );
  }

  return (
    <EmployeeOnboardingView
      data={screen.state}
      busyId={screen.busyId}
      onOpenDocument={(step) => {
        void screen.onOpenDocument(step);
      }}
      onAcknowledge={(step) => {
        void screen.onAcknowledge(step);
      }}
      onUpload={(step, file) => {
        void screen.onUpload(step, file);
      }}
      onFinish={() => {
        void screen.onFinish();
      }}
    />
  );
}
