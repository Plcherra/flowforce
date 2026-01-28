/**
 * Hook for generating assistant context from reports analytics
 */

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import type { AssistantContext } from "@/types/ai";
import type { DocumentWithRelations } from "@/types/ingestion";
import type { TimeRange } from "../types/reports";
import { parseMetaAccuracy } from "../utils/documentHelpers";

interface UseReportsContextProps {
  completionRate: number;
  accuracyScore: number;
  reportsEngagementScore: number;
  filteredDocumentsLength: number;
  followUpActions: number;
  timeRange: TimeRange;
  selectedReport: DocumentWithRelations | null;
}

export function useReportsContext({
  completionRate,
  accuracyScore,
  reportsEngagementScore,
  filteredDocumentsLength,
  followUpActions,
  timeRange,
  selectedReport,
}: UseReportsContextProps) {
  const baseContext: AssistantContext = useMemo(() => {
    const insightMessages = [];
    if (completionRate < 70) {
      insightMessages.push({
        title: "Completion pressure",
        detail:
          "Report processing completion dipped below 70%. Consider escalating stalled documents for review.",
      });
    } else {
      insightMessages.push({
        title: "Healthy completion",
        detail:
          "Completions are keeping pace with intake. Keep current routing rules.",
      });
    }

    if (followUpActions > 0) {
      insightMessages.push({
        title: "Follow-up workload",
        detail: `${followUpActions} follow-up actions were triggered in this window.`,
      });
    }

    return {
      type: "combined",
      title: "Reports Analyzer",
      subtitle: `Window: ${timeRange}`,
      metrics: [
        { label: "Completion rate", value: `${completionRate}%` },
        {
          label: "Accuracy",
          value: `${accuracyScore}%`,
          helperText: "Ready vs total reports",
        },
        {
          label: "Engagement",
          value: `${reportsEngagementScore}%`,
          helperText: `${filteredDocumentsLength} reports analyzed`,
        },
        {
          label: "Follow-ups",
          value: `${followUpActions}`,
          helperText: "Triggered actions",
        },
      ],
      insights: insightMessages,
      recommendedActions: [
        {
          label: "Analyze low accuracy reports",
          action: "Review reports with low accuracy and suggest next steps",
          intent: "analysis",
        },
        {
          label: "Trigger follow-up workflow",
          action: "Trigger a follow-up workflow for pending reports",
          intent: "copilot",
        },
        {
          label: "Compare forms vs reports trends",
          action: "Compare forms vs reports trends for this period",
          intent: "optimization",
        },
      ],
    };
  }, [
    completionRate,
    accuracyScore,
    reportsEngagementScore,
    filteredDocumentsLength,
    followUpActions,
    timeRange,
  ]);

  const selectedContext: AssistantContext | null = useMemo(() => {
    if (!selectedReport) return null;
    const report = selectedReport as any;

    const followUps = report.originating_tasks?.length ?? 0;
    const extractedAccuracy = parseMetaAccuracy(selectedReport);

    const insights = [
      report.processing_state !== "ready"
        ? {
            title: "Processing stalled",
            detail:
              "Report is not ready yet. Consider prioritizing extraction validation.",
          }
        : {
            title: "Ready for review",
            detail:
              "Report is ready. Confirm insights and close out related actions.",
          },
    ];

    if (followUps > 0) {
      insights.push({
        title: "Pending follow-ups",
        detail: `${followUps} tasks are still open for this report.`,
      });
    }

    return {
      type: "report",
      title: report.title ?? report.file?.filename ?? "Report",
      subtitle: `Updated ${formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}`,
      metrics: [
        { label: "Status", value: report.processing_state },
        {
          label: "Accuracy",
          value:
            extractedAccuracy !== null
              ? `${extractedAccuracy}%`
              : `${accuracyScore}%`,
        },
        { label: "Follow-ups", value: `${followUps}` },
        { label: "Source", value: report.source ?? "N/A" },
      ],
      insights,
      recommendedActions: [
        {
          label: "Create follow-up task",
          action: "Create a follow-up task for this report",
          intent: "copilot",
        },
        {
          label: "Summarize this report",
          action: "Summarize the selected report and highlight anomalies",
          intent: "analysis",
        },
        {
          label: "Suggest improvements",
          action: "Suggest improvements based on this report",
          intent: "optimization",
        },
      ],
    };
  }, [selectedReport, accuracyScore]);

  return {
    baseContext,
    selectedContext,
    activeContext: selectedContext ?? baseContext,
  };
}
