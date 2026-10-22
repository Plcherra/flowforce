import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/common/PageLoader";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { Users } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";

const TeamDirectory = lazy(async () =>
  import("@/features/employees/components/TeamDirectory").then((module) => ({
    default: module.TeamDirectory,
  })),
);

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const leadership = isLeadershipLevel({ name: profile?.role });
  const bootstrap = useCommunicationBootstrap({
    includeInactiveEmployees: true,
  });

  if (profile && !leadership) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title={t("employees.employeeDirectory")}
          description={t("employees.managersOnly")}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    );
  }

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text={t("employees.loadingEmployeeDirectory")} />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>{t("employees.unableToLoadDirectory")}</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title={t("employees.waitingForYourRoster")}
          description={t("employees.employeeToolsUnlock")}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <TeamDirectory />
    </Suspense>
  );
}
