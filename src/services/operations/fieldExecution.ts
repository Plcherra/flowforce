export type FieldExecutionRunRow = {
  company_id: string;
  workflow_instanceid: string;
  workflowid: string | null;
  workflow_name: string | null;
  templatecategory: string | null;
  run_status: string;
  review_status: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  location_id: string | null;
  scheduled_for: string | null;
  starts_at: string | null;
  started_at: string | null;
  due_at: string | null;
  escalation_at: string | null;
  current_stepid: string | null;
  total_steps: number;
  completed_steps: number;
  draft_steps: number;
  failed_steps: number;
  evidence_needed_steps: number;
  next_step_number: number | null;
};

export type FieldExecutionStepRow = {
  company_id: string;
  step_instanceid: string;
  workflow_instanceid: string;
  stepid: string;
  step_name: string;
  stepdescription: string | null;
  step_number: number;
  step_type: string | null;
  required: boolean | null;
  evidence_required: boolean | null;
  evidence_schema: Record<string, unknown> | null;
  exception_policy: Record<string, unknown> | null;
  failure_escalation: Record<string, unknown> | null;
  form_fieldid: string | null;
  step_status: string;
  evidence_status: string;
  evidence_payload: Record<string, unknown> | null;
  notes: string | null;
  failed_reason: string | null;
  exception_status: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type FieldExecutionRpcResult = {
  workflow_instanceid?: string;
  step_instanceid?: string;
  current_stepid?: string | null;
  next_stepid?: string | null;
  evidenceid?: string | null;
  exceptionid?: string | null;
  status?: string;
  review_status?: string;
};

export const summarizeExecutionRun = (run: FieldExecutionRunRow) => {
  const total = Math.max(run.total_steps ?? 0, 0);
  const completed = Math.max(run.completed_steps ?? 0, 0);

  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const sortExecutionRuns = (runs: FieldExecutionRunRow[]) =>
  [...runs].sort((left, right) => {
    const leftDue = left.due_at ?? "";
    const rightDue = right.due_at ?? "";
    return leftDue.localeCompare(rightDue);
  });

export const stepNeedsEvidence = (step: FieldExecutionStepRow) =>
  Boolean(step.evidence_required) &&
  step.step_status !== "completed" &&
  step.evidence_status !== "complete";

export const buildStepEvidencePayload = (
  value: string,
  status: "completed" | "failed",
) => ({
  captured_value: value,
  status,
  captured_at: new Date().toISOString(),
});
