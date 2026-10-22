import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export interface InsightsHeaderProps {
  loading: boolean;
  employeesTracked: number;
  lastRefreshLabel?: string | null;
}

export function InsightsHeader({
  loading,
  employeesTracked,
  lastRefreshLabel,
}: InsightsHeaderProps) {
  const { t } = useTranslation();
  const statusLabel = loading
    ? t("analytics.updatingInsights")
    : t("analytics.insightsUpToDate");
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {t("analytics.hrIntelligence")}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{t("common.aiInsights")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("analytics.forecastEngagementShiftsGoalRiskAndXpMilestonesAcrossYourWorkforce")}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 lg:items-end">
        <Badge variant="outline">{statusLabel}</Badge>
        <p className="text-sm text-muted-foreground">
          {employeesTracked === 1
            ? t("analytics.trackingOneEmployee", { count: employeesTracked })
            : t("analytics.trackingManyEmployees", { count: employeesTracked })}
        </p>
        {lastRefreshLabel && (
          <p className="text-xs text-muted-foreground">
            {t("analytics.synced")} {lastRefreshLabel}
          </p>
        )}
      </div>
    </header>
  );
}

export default InsightsHeader;
