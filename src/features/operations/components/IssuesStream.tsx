import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  incidentIssueSlaLabels,
  incidentIssueStatusLabels,
  isIncidentIssueClosed,
  sortIncidentIssues,
  summarizeIncidentIssues,
  type IncidentIssueQueueRow,
  type IncidentIssueStatus,
} from "@/services/operations/incidentIssueTracking";
import { logger } from "@/utils/logger";
import { LearningRecordCopy } from "@/features/learning/components/LearningRecordCopy";
import { useOpsIssueTranslations } from "@/features/i18n/hooks/useRemainingTextTranslations";
import { normalizeOpsViewRows } from "../utils/opsViewRow";

const ISSUE_STATUS_KEYS: Record<IncidentIssueStatus, string> = {
  open: "operations.issueStatusOpen",
  acknowledged: "operations.issueStatusAcknowledged",
  in_progress: "operations.issueStatusInProgress",
  blocked: "operations.issueStatusBlocked",
  resolved: "operations.issueStatusResolved",
  cancelled: "operations.issueStatusCancelled",
};

const ISSUE_SLA_KEYS: Record<IncidentIssueQueueRow["sla_status"], string> = {
  unscheduled: "operations.issueSlaUnscheduled",
  on_track: "operations.issueSlaOnTrack",
  due_soon: "operations.issueSlaDueSoon",
  overdue: "operations.issueSlaOverdue",
  resolved: "operations.issueSlaResolved",
};

function opsIssueId(issue: IncidentIssueQueueRow & { issue_id?: string | null }) {
  return issue.issue_id || issue.issueid || "";
}

function opsIssueSourceLocale(issue: IncidentIssueQueueRow) {
  const source = (issue as IncidentIssueQueueRow & {
    source?: { contentSourceLocale?: string } | null;
  }).source;
  return source?.contentSourceLocale ?? null;
}

const severityClasses: Record<IncidentIssueQueueRow["severity"], string> = {
  info: "border-border text-muted-foreground",
  warning: "border-warning/40 text-warning-foreground",
  critical: "border-destructive/40 text-destructive",
};

const slaClasses: Record<IncidentIssueQueueRow["sla_status"], string> = {
  unscheduled: "border-border text-muted-foreground",
  on_track: "border-success/40 text-success",
  due_soon: "border-warning/40 text-warning-foreground",
  overdue: "border-destructive/40 text-destructive",
  resolved: "border-success/40 text-success",
};

type IssueRpcResult = {
  issueid?: string;
  task_id?: string | null;
  status?: string;
};

export function IssuesStream() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { can, isLoading: permissionLoading } = useCan();
  const canEdit = !permissionLoading && can("editTasks");
  const [issues, setIssues] = useState<IncidentIssueQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>(
    {},
  );

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const sortedIssues = useMemo(() => sortIncidentIssues(issues), [issues]);
  const issueSources = useMemo(
    () =>
      sortedIssues.map((issue) => ({
        id: opsIssueId(issue),
        title: issue.title,
        description: issue.description,
        sourceLocale: opsIssueSourceLocale(issue),
        updated_at: issue.updated_at,
      })),
    [sortedIssues],
  );
  const issueTranslations = useOpsIssueTranslations(issueSources);
  const summary = useMemo(
    () => summarizeIncidentIssues(sortedIssues),
    [sortedIssues],
  );

  const loadIssues = useCallback(async () => {
    if (!companyId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("operations_incident_issue_queue_v")
      .select("*")
      .eq("company_id", companyId)
      .order("priority_rank", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(24);

    if (error) {
      logger.error("[IssuesStream] failed to load issues", {
        error,
        tags: ["error"],
      });
      setIssues([]);
    } else {
      setIssues(normalizeOpsViewRows<IncidentIssueQueueRow>(data));
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const updateIssueStatus = async (
    issue: IncidentIssueQueueRow,
    status: IncidentIssueStatus,
  ) => {
    if (!companyId) return;

    setActing(`${issue.issueid}:${status}`);

    try {
      const { data, error } = await supabase.rpc(
        "update_operational_issue_status",
        {
          p_company_id: companyId,
          p_issueid: issue.issueid,
          p_status: status,
          p_ownerid: null,
          p_due_at: null,
          p_resolution_notes:
            status === "resolved"
              ? resolutionNotes[issue.issueid] || t("operations.resolvedFromOperationsHub")
              : null,
        },
      );

      if (error) throw error;

      const result = (data ?? {}) as IssueRpcResult;
      const statusKey = ISSUE_STATUS_KEYS[result.status as IncidentIssueStatus];
      toast({
        title: t("operations.issueUpdated"),
        description: result.status
          ? t("operations.issueStatusMoved", {
              status: statusKey ? t(statusKey) : result.status,
            })
          : t("operations.issueLifecycleSaved"),
      });
      await loadIssues();
    } catch (error) {
      logger.error("[IssuesStream] status update failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: t("operations.issueUpdateFailed"),
        description:
          error instanceof Error ? error.message : t("operations.issueUnexpected"),
      });
    } finally {
      setActing(null);
    }
  };

  const issueList = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`ops-issue-skeleton-${index}`}
              className="h-24 w-full rounded-3xl"
            />
          ))}
        </div>
      );
    }

    if (sortedIssues.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {t("operations.noLiveIssuesEnjoyTheCalm")}
        </p>
      );
    }

    return (
      <ScrollArea className="h-[520px] pr-2">
        <div className="space-y-3">
          {sortedIssues.map((issue) => {
            const closed = isIncidentIssueClosed(issue.status);
            const issueActing = acting?.startsWith(issue.issueid);

            return (
              <motion.div
                key={issue.issueid}
                layout
                className={`rounded-3xl border bg-background/95 p-4 shadow-sm ${severityClasses[issue.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <LearningRecordCopy
                      recordId={opsIssueId(issue)}
                      title={issue.title ?? t("operations.operationalIssue")}
                      description={issue.description}
                      translation={
                        issueTranslations.get(opsIssueId(issue))
                          ? {
                              sourceLocale: issueTranslations.get(opsIssueId(issue))!.sourceLocale,
                              title:
                                issueTranslations.get(opsIssueId(issue))!.values.title ??
                                issue.title ??
                                t("operations.operationalIssue"),
                              description: issue.description
                                ? issueTranslations.get(opsIssueId(issue))!.values.description ??
                                  issue.description
                                : null,
                            }
                          : null
                      }
                      titleClassName="text-sm font-semibold"
                    />
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {issue.issue_type ?? t("operations.issueTypeGeneral")}
                      {issue.owner_name ? ` | ${issue.owner_name}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {t(ISSUE_STATUS_KEYS[issue.status] ?? issue.status, {
                      defaultValue: incidentIssueStatusLabels[issue.status] ?? issue.status,
                    })}
                  </Badge>
                </div>


                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={slaClasses[issue.sla_status]}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {t(ISSUE_SLA_KEYS[issue.sla_status] ?? issue.sla_status, {
                      defaultValue: incidentIssueSlaLabels[issue.sla_status],
                    })}
                  </Badge>
                  {issue.task_id && (
                    <Badge variant="secondary">
                      {t("forms.task")} {issue.task_status ?? "open"}
                    </Badge>
                  )}
                  {issue.workflow_name && (
                    <Badge variant="secondary">{issue.workflow_name}</Badge>
                  )}
                  {issue.inventory_item_id && (
                    <Badge variant="secondary">{issue.inventory_item_id}</Badge>
                  )}
                </div>

                {!closed && canEdit && (
                  <Textarea
                    className="mt-3 min-h-[64px]"
                    placeholder={t("operations.resolutionNotes")}
                    value={resolutionNotes[issue.issueid] ?? ""}
                    onChange={(event) =>
                      setResolutionNotes((current) => ({
                        ...current,
                        [issue.issueid]: event.target.value,
                      }))
                    }
                  />
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit ? (
                  <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "acknowledged")}
                  >
                    {issueActing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <AlertCircle className="mr-2 h-3.5 w-3.5" />
                    )}
                    {t("operations.ack")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "in_progress")}
                  >
                    <PlayCircle className="mr-2 h-3.5 w-3.5" />
                    {t("schedule.start")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "resolved")}
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    {t("operations.resolve")}
                  </Button>
                  </>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [acting, canEdit, loading, resolutionNotes, sortedIssues, t]);

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            {t("operations.issues")}
          </p>
          <h3 className="text-lg font-semibold">{t("operations.operationalIssues")}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{summary.open} {t("operations.open")}</Badge>
          <Badge variant="outline">{summary.overdue} {t("analytics.overdue")}</Badge>
          <Badge variant="outline">{summary.critical} {t("operations.critical")}</Badge>
        </div>
      </div>
      <div className="mt-4">{issueList}</div>
    </div>
  );
}
