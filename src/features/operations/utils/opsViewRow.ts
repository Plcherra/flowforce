const OPS_VIEW_ALIASES: Record<string, string> = {
  issueid: "issue_id",
  ownerid: "owner_id",
  workflow_instanceid: "workflow_instance_id",
  workflow_exceptionid: "workflow_exception_id",
  ai_suggestionid: "ai_suggestion_id",
  workflowid: "workflow_id",
  templatecategory: "template_category",
  current_stepid: "current_step_id",
  step_instanceid: "step_instance_id",
  stepid: "step_id",
  stepdescription: "step_description",
  form_fieldid: "form_field_id",
  automation_runid: "automation_run_id",
  ops_issueid: "ops_issue_id",
  notificationid: "notification_id",
  reviewerid: "reviewer_id",
  departmentid: "department_id",
};

export function normalizeOpsViewRow<T>(row: unknown): T {
  if (!row || typeof row !== "object") return {} as T;
  const next: Record<string, unknown> = {
    ...(row as Record<string, unknown>),
  };
  for (const [alias, source] of Object.entries(OPS_VIEW_ALIASES)) {
    if (next[alias] == null && next[source] != null) {
      next[alias] = next[source];
    }
  }
  return next as T;
}

export function normalizeOpsViewRows<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => normalizeOpsViewRow<T>(row));
}
