export type IncidentIssueSeverity = "info" | "warning" | "critical";

export type IncidentIssueStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "cancelled";

export type IncidentIssueSlaStatus =
  | "unscheduled"
  | "on_track"
  | "due_soon"
  | "overdue"
  | "resolved";

export type IncidentIssueQueueRow = {
  company_id: string;
  issue_id: string;
  title: string | null;
  description: string | null;
  issue_type: string | null;
  severity: IncidentIssueSeverity;
  status: IncidentIssueStatus;
  owner_id: string | null;
  owner_name: string | null;
  due_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  task_id: string | null;
  task_title: string | null;
  task_status: string | null;
  workflow_instance_id: string | null;
  workflow_run_status: string | null;
  workflow_name: string | null;
  workflow_exception_id: string | null;
  workflow_exception_severity: string | null;
  workflow_exception_status: string | null;
  inventory_item_id: string | null;
  ai_suggestion_id: string | null;
  ai_suggestion_status: string | null;
  priority_rank: number;
  sla_status: IncidentIssueSlaStatus;
  open_for_minutes: number;
  created_at: string | null;
  updated_at: string | null;
};

export type IncidentIssueReportRow = {
  company_id: string;
  issue_type: string;
  severity: IncidentIssueSeverity;
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  overdue_issues: number;
  avg_resolution_hours: number | null;
};

export const incidentIssueStatusLabels: Record<IncidentIssueStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  blocked: "Blocked",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export const incidentIssueSlaLabels: Record<IncidentIssueSlaStatus, string> = {
  unscheduled: "No due date",
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
  resolved: "Resolved",
};

export const summarizeIncidentIssues = (issues: IncidentIssueQueueRow[]) => ({
  total: issues.length,
  open: issues.filter((issue) => !["resolved", "cancelled"].includes(issue.status))
    .length,
  overdue: issues.filter((issue) => issue.sla_status === "overdue").length,
  critical: issues.filter((issue) => issue.severity === "critical").length,
});

export const sortIncidentIssues = (issues: IncidentIssueQueueRow[]) =>
  [...issues].sort((left, right) => {
    if (left.priority_rank !== right.priority_rank) {
      return left.priority_rank - right.priority_rank;
    }

    return (left.due_at ?? "9999-12-31").localeCompare(
      right.due_at ?? "9999-12-31",
    );
  });

export const isIncidentIssueClosed = (status: IncidentIssueStatus) =>
  status === "resolved" || status === "cancelled";
