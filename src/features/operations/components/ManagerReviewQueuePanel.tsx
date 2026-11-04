import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  ThumbsDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  sortReviewQueue,
  summarizeReviewQueue,
  type ManagerReviewQueueRow,
  type ReviewWorkflowRunResult,
  type WorkflowReviewStatus,
} from "@/services/operations/managerReviewQueue";
import { logger } from "@/utils/logger";
import { reviewPriorityLabel } from "../utils/operationsHubLabels";
import { normalizeOpsViewRows } from "../utils/opsViewRow";

export function ManagerReviewQueuePanel() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { can, isLoading: permissionLoading } = useCan();
  const canEdit = !permissionLoading && can("editTasks");
  const [rows, setRows] = useState<ManagerReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const sortedRows = useMemo(() => sortReviewQueue(rows), [rows]);
  const summary = useMemo(() => summarizeReviewQueue(rows), [rows]);

  const loadQueue = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("operations_manager_review_queue_v")
        .select("*")
        .eq("company_id", companyId)
        .order("due_at", { ascending: true });

      if (error) {
        throw error;
      }

      setRows(normalizeOpsViewRows<ManagerReviewQueueRow>(data));
    } catch (error) {
      logger.error("[ManagerReviewQueuePanel] queue load failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: t("operations.unableToLoadReviewQueue"),
        description:
          error instanceof Error ? error.message : t("operations.unexpectedReviewError"),
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, t, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleReview = async (
    workflowInstanceId: string,
    reviewStatus: WorkflowReviewStatus,
  ) => {
    if (!companyId) {
      toast({
        variant: "destructive",
        title: t("operations.companyContextMissing"),
        description: t("operations.connectProfileBeforeReview"),
      });
      return;
    }

    setReviewingId(`${workflowInstanceId}:${reviewStatus}`);

    try {
      const { data, error } = await supabase.rpc("review_workflow_run", {
        p_company_id: companyId,
        p_workflow_instanceid: workflowInstanceId,
        p_review_status: reviewStatus,
        p_comments:
          reviewStatus === "approved"
            ? t("operations.approvedFromReviewQueue")
            : t("operations.flaggedFromReviewQueue"),
      });

      if (error) {
        throw error;
      }

      const result = (data ?? {}) as ReviewWorkflowRunResult;
      await loadQueue();

      toast({
        title: t("operations.workflowReviewTitle", {
          status: result.review_status ?? reviewStatus,
        }),
        description: t("operations.reviewWasAudited"),
      });
    } catch (error) {
      logger.error("[ManagerReviewQueuePanel] review action failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: t("operations.unableToReviewWorkflow"),
        description:
          error instanceof Error ? error.message : t("operations.unexpectedReviewAction"),
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            {t("operations.managerReview")}
          </p>
          <h3 className="text-lg font-semibold">{t("operations.workflowQueue")}</h3>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <MessageSquareWarning className="h-3.5 w-3.5" />
          {summary.total} {t("operations.open")}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.severe}</p>
          <p className="text-muted-foreground">{t("operations.severe")}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.exceptions}</p>
          <p className="text-muted-foreground">{t("operations.exceptions2")}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.overdue}</p>
          <p className="text-muted-foreground">{t("shell.overdue")}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("operations.loadingReviewQueue")}
          </div>
        ) : sortedRows.length ? (
          sortedRows.slice(0, 4).map((row) => {
            return (
            <div
              key={row.workflow_instanceid}
              className="rounded-2xl border bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {row.workflow_name ?? t("operations.workflowRunLabel")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.scheduled_for ?? t("operations.unscheduledLabel")} ·{" "}
                    {row.open_exception_count} {t("operations.exceptions")}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {reviewPriorityLabel(t, row.review_priority)}
                </Badge>
              </div>

              {row.latest_review_comments ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.latest_review_comments}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    handleReview(row.workflow_instanceid, "approved")
                  }
                  disabled={reviewingId !== null || !canEdit}
                >
                  {reviewingId === `${row.workflow_instanceid}:approved` ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  {t("operations.approveReview")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleReview(row.workflow_instanceid, "needs_changes")
                  }
                  disabled={reviewingId !== null || !canEdit}
                >
                  <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                  {t("operations.needsChanges")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleReview(row.workflow_instanceid, "rejected")
                  }
                  disabled={reviewingId !== null || !canEdit}
                >
                  <ThumbsDown className="mr-2 h-3.5 w-3.5" />
                  {t("schedule.reject")}
                </Button>
              </div>
            </div>
          );
          })
        ) : (
          <div className="rounded-2xl border p-3 text-sm text-muted-foreground">
            {t("operations.noWorkflowRunsNeedManagerReview")}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={loadQueue} disabled={!companyId}>
          {t("common.refresh")}
        </Button>
      </div>
    </div>
  );
}
