import { useTranslation } from "react-i18next";
/**
 * Metrics cards component for ReportsAnalyzer
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldCheck, TrendingUp, Workflow } from "lucide-react";

interface MetricsCardsProps {
  completionRate: number;
  reportsEngagementScore: number;
  accuracyScore: number;
  followUpActions: number;
}

export function MetricsCards({
  completionRate,
  reportsEngagementScore,
  accuracyScore,
  followUpActions,
}: MetricsCardsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("inventory.completionRate")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{completionRate}%</div>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("analytics.combinedFormsAndReportsCompletedThisWindow")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("updates.engagement2")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">
              {reportsEngagementScore}%
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("analytics.reportsAnalyzedVsIntakeFactoringFollowUpActions")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("analytics.accuracy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{accuracyScore}%</div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("analytics.percentOfReportsThatFinishedProcessingSuccessfully")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("analytics.followUpActions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{followUpActions}</div>
            <Workflow className="h-5 w-5 text-secondary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("analytics.tasksSpawnedFromAiInsightsAndReportReviews")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
