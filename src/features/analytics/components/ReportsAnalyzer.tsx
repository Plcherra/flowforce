import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileBarChart2, BarChart3 } from "lucide-react";
import { useForms } from "@/features/forms/hooks/useForms";
import { useDocumentInbox } from "@/hooks/useDocumentIngestion";
import { useProfile } from "@/hooks/useProfile";
import { asArray } from "@/utils/reactQueryTypes";
import type { AssistantContext } from "@/types/ai";
import type { DocumentWithRelations } from "@/types/ingestion";
import { useReportsMetrics } from "@/features/analytics/hooks/useReportsMetrics";
import { useReportsContext } from "@/features/analytics/hooks/useReportsContext";
import { exportReportsData } from "@/features/analytics/utils/exportHelpers";
import {
  VolumeTrendChart,
  ComparisonBarChart,
  StatusPieChart,
} from "@/features/analytics/components/charts";
import {
  MetricsCards,
  ReportsList,
} from "@/features/analytics/components/reports";
import type {
  TimeRange,
  CompareMetric,
} from "@/features/analytics/types/reports";

interface ReportsAnalyzerProps {
  onContextChange?: (context: AssistantContext) => void;
}

export function ReportsAnalyzer({ onContextChange }: ReportsAnalyzerProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [compareMetric, setCompareMetric] = useState<CompareMetric>("volume");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { forms } = useForms();
  const { data: documentsData, isLoading } = useDocumentInbox({
    limit: 100,
    companyId: companyId ?? undefined,
  });
  const documents = asArray(documentsData);
  const formsArray = Array.isArray(forms) ? forms : [];

  const metrics = useReportsMetrics({
    documents,
    forms: formsArray,
    timeRange,
    compareMetric,
  });

  const sortedDocuments = useMemo(
    () => {
      if (!metrics?.filteredDocuments || !Array.isArray(metrics.filteredDocuments)) {
        return [];
      }
      return [...metrics.filteredDocuments].sort((a, b) => {
        const aDate = new Date(
          a.created_at ?? 0,
        ).getTime();
        const bDate = new Date(
          b.created_at ?? 0,
        ).getTime();
        return bDate - aDate;
      });
    },
    [metrics?.filteredDocuments],
  );

  const selectedReport = useMemo(
    () =>
      sortedDocuments.find(
        (document: DocumentWithRelations) => document.id === selectedReportId,
      ) ?? null,
    [sortedDocuments, selectedReportId],
  );

  const { activeContext } = useReportsContext({
    completionRate: metrics?.completionRate ?? 0,
    accuracyScore: metrics?.accuracyScore ?? 0,
    reportsEngagementScore: metrics?.reportsEngagementScore ?? 0,
    filteredDocumentsLength: metrics?.filteredDocuments?.length ?? 0,
    followUpActions: metrics?.followUpActions ?? 0,
    timeRange,
    selectedReport,
  });

  useEffect(() => {
    if (!onContextChange) return;
    onContextChange(activeContext);
  }, [onContextChange, activeContext]);

  const handleExport = () => {
    exportReportsData(
      metrics.comparisonData,
      metrics.completionRate,
      metrics.accuracyScore,
      metrics.formsWithActivity.length,
      metrics.followUpActions,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-primary" />
            {t("analytics.reportsAnalyzer")}
          </h2>
          <p className="text-muted-foreground">
            {t("analytics.consolidatedInsightAcrossFormsAndInternalReportsWithAiPoweredPredictions")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={timeRange}
            onValueChange={(value: TimeRange) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7d">{t("analytics.last7Days")}</SelectItem>
              <SelectItem value="30d">{t("analytics.last30Days")}</SelectItem>
              <SelectItem value="90d">{t("analytics.last90Days")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={compareMetric}
            onValueChange={(value: CompareMetric) => setCompareMetric(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("analytics.compareBy")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="volume">{t("analytics.compareVolume")}</SelectItem>
              <SelectItem value="completion">{t("analytics.compareCompletion")}</SelectItem>
              <SelectItem value="engagement">{t("analytics.compareEngagement")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {t("schedule.export")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <MetricsCards
            completionRate={metrics.completionRate}
            reportsEngagementScore={metrics.reportsEngagementScore}
            accuracyScore={metrics.accuracyScore}
            followUpActions={metrics.followUpActions}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics.volumeTrend")}</CardTitle>
              </CardHeader>
              <CardContent>
                <VolumeTrendChart data={metrics.timelineData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("analytics.comparison")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart data={metrics.comparisonData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("analytics.statusMix")}</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPieChart data={metrics.statusBreakdown} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>{t("analytics.aiPredictionsTips")}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {t("analytics.liveGuidanceGeneratedFromCurrentAnalytics")}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeContext.insights.map((insight) => {
                  return (
                  <div key={insight.title} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{insight.title}</h4>
                      </div>
                      <Badge variant="secondary">{t("analytics.aiInsight")}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {insight.detail}
                    </p>
                  </div>
                );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>{t("analytics.recentReports")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("analytics.clickAReportToSpotlightContextInTheAiAssistant")}
                </p>
              </div>
              <Badge variant="outline">
                {metrics.filteredDocuments.length} {t("analytics.reports")}{" "}
                {metrics.followUpActions} {t("analytics.followUps")}
              </Badge>
            </CardHeader>
            <CardContent>
              <ReportsList
                documents={sortedDocuments}
                selectedReportId={selectedReportId}
                onReportSelect={setSelectedReportId}
                followUpActions={metrics.followUpActions}
                filteredDocumentsLength={metrics.filteredDocuments.length}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
