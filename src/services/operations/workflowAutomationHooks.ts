export type WorkflowAutomationHookType =
  | "failed_step_task"
  | "inventory_review_issue"
  | "overdue_critical_notification";

export type WorkflowAutomationRunStatus = "completed" | "skipped" | "failed";

export type WorkflowAutomationHookRow = {
  company_id: string;
  automation_runid: string;
  automation_key: string;
  hook_type: WorkflowAutomationHookType;
  status: WorkflowAutomationRunStatus;
  workflowid: string | null;
  workflow_name: string | null;
  workflow_instanceid: string | null;
  workflow_run_status: string | null;
  step_instanceid: string | null;
  workflow_exceptionid: string | null;
  exception_title: string | null;
  exception_severity: string | null;
  task_id: string | null;
  task_title: string | null;
  ops_issueid: string | null;
  issue_title: string | null;
  notificationid: string | null;
  notification_title: string | null;
  action_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string | null;
};

export type WorkflowAutomationRpcResult = {
  created_count?: number;
  skipped_count?: number;
  failed_step_task_created?: boolean;
  inventory_review_issue_created?: boolean;
  task_id?: string | null;
  ops_issueid?: string | null;
};

export const workflowAutomationHookLabels: Record<
  WorkflowAutomationHookType,
  string
> = {
  failed_step_task: "Failed step task",
  inventory_review_issue: "Inventory review",
  overdue_critical_notification: "Overdue notification",
};

export const summarizeWorkflowAutomationHooks = (
  hooks: WorkflowAutomationHookRow[],
) => ({
  total: hooks.length,
  failed: hooks.filter((hook) => hook.status === "failed").length,
  tasks: hooks.filter((hook) => hook.hook_type === "failed_step_task").length,
  inventoryReviews: hooks.filter(
    (hook) => hook.hook_type === "inventory_review_issue",
  ).length,
  notifications: hooks.filter(
    (hook) => hook.hook_type === "overdue_critical_notification",
  ).length,
});

export const sortWorkflowAutomationHooks = (
  hooks: WorkflowAutomationHookRow[],
) =>
  [...hooks].sort((left, right) =>
    (right.created_at ?? "").localeCompare(left.created_at ?? ""),
  );
