import { useTranslation } from "react-i18next";
import { AlertTriangle, Stethoscope, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { IdeaKpiInsight } from "@/features/operations/hooks/useIdeaInsights";
import type { useIdeaDiagnostics } from "@/features/operations/hooks/useIdeaDiagnostics";
import { useIdeaContext } from "@/features/operations/contexts/IdeaProvider";
import { useAIKPIInsights } from "@/hooks/useAIKPIInsights";

interface DiagnosePanelProps {
  insights: IdeaKpiInsight[];
  diagnostics: ReturnType<typeof useIdeaDiagnostics>;
  stageDescription: string;
  onRecommend: () => void;
}

export function DiagnosePanel({
  insights,
  diagnostics,
  stageDescription,
  onRecommend,
}: DiagnosePanelProps) {
  const { t } = useTranslation();
  const { companyId, range } = useIdeaContext();
  const aiInsightsQuery = useAIKPIInsights(companyId, {
    start: range.start,
    end: range.end,
  });
  const aiInsights = aiInsightsQuery.data ?? [];
  const anomalies = insights.filter(
    (insight) => Math.abs(insight.delta ?? 0) >= 1,
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-border/40 dark:bg-background/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("operations.diagnose")}
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("operations.investigateRootCauses")}
        </h2>
        <p className="text-sm text-muted-foreground">{stageDescription}</p>
        <div>
          <Button onClick={onRecommend} disabled={diagnostics.loading}>
            <Target className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("operations.recommendActions")}
          </Button>
        </div>
      </header>

      {diagnostics.error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("operations.diagnosticsFailed")}</AlertTitle>
          <AlertDescription>{diagnostics.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {diagnostics.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/60 bg-muted/30">
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60 bg-background/70 shadow-sm dark:border-border/40 dark:bg-background/30">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                {t("operations.topAnomalies")}
              </CardTitle>
              <CardDescription>
                {t("operations.kpisWithTheLargestDeviations")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("operations.noSignificantAnomaliesDetected")}
                </p>
              ) : (
                anomalies.slice(0, 6).map((anomaly) => {
                  return (
                  <div
                    key={anomaly.id}
                    className="rounded-md border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="text-sm font-medium text-foreground">
                      {anomaly.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("operations.change2")}{" "}
                      {anomaly.delta ? anomaly.delta.toFixed(2) : "0.00"}{" "}
                      {anomaly.unit ?? ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("operations.trend")} {anomaly.trend ?? "unknown"}
                    </div>
                  </div>
                );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm dark:border-border/40 dark:bg-background/30">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                {t("operations.aiIntelligence")}
              </CardTitle>
              <CardDescription>{t("operations.probableCausesAndNarratives")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostics.data.causes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("operations.runDiagnosticsToSurfacePotentialCauses")}
                </p>
              ) : (
                diagnostics.data.causes.map((cause) => {
                  return (
                  <div
                    key={cause.id}
                    className="rounded-md border border-border/40 bg-muted/20 p-3"
                  >
                    <div className="text-sm font-medium text-foreground">
                      {cause.summary}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("analytics.confidence")} {Math.round(cause.confidence * 100)}%
                    </div>
                  </div>
                );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm dark:border-border/40 dark:bg-background/30">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                {t("operations.aiKpiInsights")}
              </CardTitle>
              <CardDescription>
                {t("operations.signalsSurfacedByGptCoPilot")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiInsightsQuery.isLoading ? (
                <AiInsightsSkeleton />
              ) : aiInsightsQuery.isError ? (
                <p className="text-sm text-muted-foreground">
                  {t("operations.unableToLoadAiKpiInsightsRightNowTryAgainAfterRefreshing")}
                </p>
              ) : aiInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("operations.aiKpiInsightsWillPopulateOnceDiagnosticRunsComplete")}
                </p>
              ) : (
                aiInsights.map((entry) => {
                  const changeValue =
                    typeof entry.change === "number" ? entry.change : 0;
                  const formattedChange = `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(1)}`;

                  return (
                    <div
                      key={entry.metric}
                      className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="text-sm font-medium text-foreground">
                        {entry.metric}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {t("operations.signal")} {entry.signal}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("operations.change2")} {formattedChange}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("operations.impact")} {entry.impact}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function AiInsightsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3 dark:border-border/30 dark:bg-muted/10"
        >
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export default DiagnosePanel;
