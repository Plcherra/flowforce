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
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  reviewActionLabels,
  reviewPriorityLabels,
  sortReviewQueue,
  summarizeReviewQueue,
  type ManagerReviewQueueRow,
  type ReviewWorkflowRunResult,
  type WorkflowReviewStatus,
} from "@/services/operations/managerReviewQueue";
import { logger } from "@/utils/logger";

export function ManagerReviewQueuePanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
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

      setRows((data ?? []) as ManagerReviewQueueRow[]);
    } catch (error) {
      logger.error("[ManagerReviewQueuePanel] queue load failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to load review queue",
        description:
          error instanceof Error ? error.message : "Unexpected review error.",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

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
        title: "Company context missing",
        description: "Connect your profile to a company before reviewing.",
      });
      return;
    }

    setReviewingId(`${workflowInstanceId}:${reviewStatus}`);

    try {
      const { data, error } = await supabase.rpc("review_workflow_run", {
        p_company_id: companyId,
        p_workflow_instance_id: workflowInstanceId,
        p_review_status: reviewStatus,
        p_comments:
          reviewStatus === "approved"
            ? "Approved from manager review queue."
            : "Flagged from manager review queue.",
      });

      if (error) {
        throw error;
      }

      const result = (data ?? {}) as ReviewWorkflowRunResult;
      await loadQueue();

      toast({
        title: `Workflow ${result.review_status ?? reviewStatus}`,
        description: "The review decision was audited.",
      });
    } catch (error) {
      logger.error("[ManagerReviewQueuePanel] review action failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to review workflow",
        description:
          error instanceof Error ? error.message : "Unexpected review action.",
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
            Manager Review
          </p>
          <h3 className="text-lg font-semibold">Workflow Queue</h3>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <MessageSquareWarning className="h-3.5 w-3.5" />
          {summary.total} open
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.severe}</p>
          <p className="text-muted-foreground">Severe</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.exceptions}</p>
          <p className="text-muted-foreground">Exceptions</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{summary.overdue}</p>
          <p className="text-muted-foreground">Overdue</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading review queue
          </div>
        ) : sortedRows.length ? (
          sortedRows.slice(0, 4).map((row) => (
            <div
              key={row.workflow_instance_id}
              className="rounded-2xl border bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {row.workflow_name ?? "Workflow run"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.scheduled_for ?? "Unscheduled"} ·{" "}
                    {row.open_exception_count} exceptions
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {reviewPriorityLabels[row.review_priority]}
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
                    handleReview(row.workflow_instance_id, "approved")
                  }
                  disabled={reviewingId !== null}
                >
                  {reviewingId === `${row.workflow_instance_id}:approved` ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  {reviewActionLabels.approved}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleReview(row.workflow_instance_id, "needs_changes")
                  }
                  disabled={reviewingId !== null}
                >
                  <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                  Needs changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleReview(row.workflow_instance_id, "rejected")
                  }
                  disabled={reviewingId !== null}
                >
                  <ThumbsDown className="mr-2 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border p-3 text-sm text-muted-foreground">
            No workflow runs need manager review.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={loadQueue} disabled={!companyId}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
