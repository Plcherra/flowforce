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
import { format } from "date-fns";
import { useForms } from "@/hooks/useForms";
import { useDocumentInbox } from "@/hooks/useDocumentIngestion";
import { asArray } from "@/utils/reactQueryTypes";
import type { AssistantContext } from "@/types/ai";
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
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [compareMetric, setCompareMetric] = useState<CompareMetric>("volume");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { forms } = useForms();
  const { data: documentsData, isLoading } = useDocumentInbox({ limit: 100 });
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
      return [...metrics.filteredDocuments].sort((a: any, b: any) => {
        const aDate = new Date(
          (a?.created_at as string | undefined) ?? 0,
        ).getTime();
        const bDate = new Date(
          (b?.created_at as string | undefined) ?? 0,
        ).getTime();
        return bDate - aDate;
      });
    },
    [metrics?.filteredDocuments],
  );

  const selectedReport = useMemo(
    () =>
      sortedDocuments.find(
        (document: any) => document.id === selectedReportId,
      ) ?? null,
    [sortedDocuments, selectedReportId],
  );

  const { activeContext } = useReportsContext({
    completionRate: metrics?.completionRate ?? 0,
    accuracyScore: metrics?.accuracyScore ?? 0,
    reportsEngagementScore: metrics?.reportsEngagementScore ?? 0,
    filteredDocumentsLength: metrics?.filteredDocuments?.length ?? 0,
    followUpActions: metrics?.followUpActions ?? [],
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
            Reports Analyzer
          </h2>
          <p className="text-muted-foreground">
            Consolidated insight across forms and internal reports with AI
            powered predictions.
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
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={compareMetric}
            onValueChange={(value: CompareMetric) => setCompareMetric(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Compare by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="volume">Compare volume</SelectItem>
              <SelectItem value="completion">Compare completion</SelectItem>
              <SelectItem value="engagement">Compare engagement</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
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
                <CardTitle>Volume trend</CardTitle>
              </CardHeader>
              <CardContent>
                <VolumeTrendChart data={metrics.timelineData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart data={metrics.comparisonData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Status mix</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPieChart data={metrics.statusBreakdown} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>AI predictions & tips</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Live guidance generated from current analytics.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeContext.insights.map((insight) => (
                  <div key={insight.title} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{insight.title}</h4>
                      </div>
                      <Badge variant="secondary">AI insight</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {insight.detail}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Recent reports</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a report to spotlight context in the AI assistant.
                </p>
              </div>
              <Badge variant="outline">
                {metrics.filteredDocuments.length} reports •{" "}
                {metrics.followUpActions} follow-ups
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
