import { useTranslation } from "react-i18next";
import { useState } from "react";
import { LineChart, RefreshCcw, RotateCcw } from "lucide-react";
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
import type { useIdeaAssessments } from "@/features/operations/hooks/useIdeaAssessments";
import { useToast } from "@/hooks/use-toast";

interface AssessPanelProps {
  insights: IdeaKpiInsight[];
  assessments: ReturnType<typeof useIdeaAssessments>;
  stageDescription: string;
  onRestart: () => void;
}

export function AssessPanel({
  insights,
  assessments,
  stageDescription,
  onRestart,
}: AssessPanelProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const assessmentsData = Array.isArray(assessments.data)
    ? assessments.data
    : [];
  const hasAssessments = assessmentsData.length > 0;
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      await assessments.saveAssessment(
        "Captured automatically via IDEA cycle.",
      );
      toast({
        title: "Assessment saved",
        description: "Results have been stored for this IDEA cycle.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to save assessment",
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-border/40 dark:bg-background/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LineChart className="h-4 w-4 text-success" aria-hidden="true" />
          {t("operations.assess")}
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("operations.trackImpactAndIterate")}
        </h2>
        <p className="text-sm text-muted-foreground">{stageDescription}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={assessments.loading || saving}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("operations.saveAssessment")}
          </Button>
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("operations.startNewCycle")}
          </Button>
        </div>
      </header>

      {assessments.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("operations.unableToLoadAssessmentAnalytics")}</AlertTitle>
          <AlertDescription>{assessments.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {assessments.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="border-border/60 bg-muted/30 dark:border-border/40 dark:bg-muted/20"
            >
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasAssessments ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {assessmentsData.map((metric) => {
            return (
            <Card
              key={metric.metric}
              className="border-border/60 bg-background/70 shadow-sm dark:border-border/40 dark:bg-background/30"
            >
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                  {metric.metric}
                </CardTitle>
                <CardDescription>
                  {t("operations.roi")}{" "}
                  {metric.roi === null
                    ? "n/a"
                    : `${metric.roi > 0 ? "+" : ""}${metric.roi.toFixed(1)}%`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t("operations.before")}</span>
                  <span>
                    {metric.before.toLocaleString()}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t("operations.after")}</span>
                  <span>
                    {metric.after.toLocaleString()}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span>{t("operations.change")}</span>
                  <span
                    className={
                      metric.delta >= 0 ? "text-success" : "text-accent-foreground"
                    }
                  >
                    {metric.delta >= 0 ? "+" : ""}
                    {metric.delta.toFixed(2)}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      ) : (
        <Card className="border-border/60 bg-background/70 shadow-sm dark:border-border/40 dark:bg-background/30">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              {t("operations.awaitingActions")}
            </CardTitle>
            <CardDescription>
              {t("operations.completeExecuteStageWorkToUnlockAssessmentInsights")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("operations.onceActionsAreExecutedIdeaWillCompareBeforeAndAfterKpisToCalculateLiftAndReturnOnImpact")}
            </p>
            <p>{t("operations.currentKpiCoverage")} {insights.length} {t("operations.trackedMetrics")}</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export default AssessPanel;
