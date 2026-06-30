export type WorkflowReviewStatus = "approved" | "rejected" | "needs_changes";

export type ReviewPriority =
  | "critical"
  | "exception"
  | "overdue"
  | "rejected"
  | "needs_changes"
  | "pending";

export type ManagerReviewQueueRow = {
  company_id: string;
  workflow_instanceid: string;
  workflowid: string | null;
  workflow_name: string | null;
  templatecategory: string | null;
  run_status: string | null;
  review_status: string;
  assigned_to: string | null;
  assigned_role: string | null;
  location_id: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  escalation_at: string | null;
  open_exception_count: number;
  severe_exception_count: number;
  next_exception_due_at: string | null;
  reviewerid: string | null;
  latest_review_comments: string | null;
  latest_reviewed_at: string | null;
  review_priority: ReviewPriority;
};

export type ReviewWorkflowRunResult = {
  workflow_instanceid?: string;
  reviewid?: string;
  review_status?: WorkflowReviewStatus;
  open_exception_count?: number;
};

export const reviewPriorityRank: Record<ReviewPriority, number> = {
  critical: 0,
  exception: 1,
  overdue: 2,
  rejected: 3,
  needs_changes: 4,
  pending: 5,
};

export const reviewPriorityLabels: Record<ReviewPriority, string> = {
  critical: "Critical",
  exception: "Exception",
  overdue: "Overdue",
  rejected: "Rejected",
  needs_changes: "Needs changes",
  pending: "Pending",
};

export const reviewActionLabels: Record<WorkflowReviewStatus, string> = {
  approved: "Approve",
  rejected: "Reject",
  needs_changes: "Needs changes",
};

export const sortReviewQueue = (rows: ManagerReviewQueueRow[]) =>
  [...rows].sort((left, right) => {
    const priorityDelta =
      reviewPriorityRank[left.review_priority] -
      reviewPriorityRank[right.review_priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (left.due_at ?? "").localeCompare(right.due_at ?? "");
  });

export const summarizeReviewQueue = (rows: ManagerReviewQueueRow[]) => {
  return rows.reduce(
    (summary, row) => ({
      total: summary.total + 1,
      severe: summary.severe + (row.severe_exception_count > 0 ? 1 : 0),
      exceptions:
        summary.exceptions + (row.open_exception_count > 0 ? 1 : 0),
      overdue: summary.overdue + (row.review_priority === "overdue" ? 1 : 0),
    }),
    { total: 0, severe: 0, exceptions: 0, overdue: 0 },
  );
};
