import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCertifications } from "@/hooks/useCertifications";
import { useTranslation } from "react-i18next";
import { CertificationsHeader } from "./CertificationsHeader";
import { CertificationList } from "./CertificationList";
import { EmptyCertificationsState } from "./EmptyCertificationsState";

const metricLabelKeys: Record<string, string> = {
  tasks: "certifications.requirementLabels.tasks",
  goals: "certifications.requirementLabels.goals",
  xp: "certifications.requirementLabels.xp",
  courses: "learning.coursesFinished",
};

function MetricsGrid({
  metrics,
}: {
  metrics: ReturnType<typeof useCertifications>["metrics"] | null;
}) {
  const { t } = useTranslation();
  if (!metrics) return null;
  const cards = [
    {
      key: "tasks",
      label: t(metricLabelKeys.tasks),
      value: metrics.completedTasks ?? 0,
    },
    {
      key: "goals",
      label: t(metricLabelKeys.goals),
      value: metrics.completedGoals ?? 0,
    },
    { key: "xp", label: t(metricLabelKeys.xp), value: metrics.totalXp ?? 0 },
    {
      key: "courses",
      label: t(metricLabelKeys.courses),
      value: metrics.completedCourses ?? 0,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {card.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CertificationsPage() {
  const { t } = useTranslation();
  const { certifications, loading, error, refresh, metrics } =
    useCertifications();

  return (
    <div className="space-y-6 p-6">
      <CertificationsHeader
        loading={loading}
        onRefresh={() => refresh?.()}
        title={t("certifications.title", "Certifications")}
        description={t("learning.trackSkillUnlocks")}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>
            {t("learning.unableToLoadCertifications")}
          </AlertTitle>
          <AlertDescription>
            {t(error, { defaultValue: error })}
          </AlertDescription>
        </Alert>
      )}

      <MetricsGrid metrics={metrics} />

      {certifications.length === 0 && !loading ? (
        <EmptyCertificationsState
          title={t("certifications.emptyState")}
          description={t("learning.eligibleCertifications")}
        />
      ) : (
        <CertificationList certifications={certifications} loading={loading} />
      )}
    </div>
  );
}

export default CertificationsPage;
