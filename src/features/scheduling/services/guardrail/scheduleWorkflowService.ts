import { supabase } from "@/integrations/supabase/client";
import type {
  ScheduleRulebook,
  StepCriterion,
} from "@/types/scheduleRulebook";
import { logger } from "@/utils/logger";

export interface WorkflowCriterionSnapshot {
  recordId?: string;
  workflowStepId: string;
  rulebookCriterionId: string;
  status: "pending" | "satisfied" | "rejected";
  value?: number | string | boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface WorkflowStepSnapshot {
  workflowStepId: string;
  state: "not_started" | "in_progress" | "complete";
  criteria: Record<string, WorkflowCriterionSnapshot>;
}

export type WorkflowSnapshot = Record<string, WorkflowStepSnapshot>;

export async function fetchWorkflowSnapshot(
  rulebook: ScheduleRulebook,
  workflowId: string,
): Promise<WorkflowSnapshot> {
  if (!workflowId) {
    return {};
  }

  await ensureWorkflowSteps(rulebook, workflowId);

  const { data, error } = await supabase
    .from("schedule_workflow_steps")
    .select(
      `
      id,
      rulebook_stepid,
      state,
      completed_at,
      schedule_rulebook_step:rulebook_stepid(
        slug,
        schedule_rulebook_step_criteria (
          id,
          slug
        )
      ),
      schedule_workflow_criteria (
        id,
        rulebook_criterionid,
        status,
        evidence_value,
        approved_by,
        approved_at,
        schedule_rulebook_step_criteria:rulebook_criterionid (
          slug
        )
      )
    `,
    )
    .eq("workflowid", workflowId);

  if (error) {
    logger.error("Failed to load workflow snapshot", {
      error,
      tags: ["error"],
    });
    return {};
  }

  const snapshot: WorkflowSnapshot = {};

  (data || []).forEach((workflowStep) => {
    const stepRelation = workflowStep.schedule_rulebook_step as any;
    const stepSlug = (
      Array.isArray(stepRelation) ? stepRelation[0] : stepRelation
    )?.slug;
    if (!stepSlug) {
      return;
    }

    const stepEntry: WorkflowStepSnapshot = snapshot[stepSlug] || {
      workflowStepId: workflowStep.id,
      state: (workflowStep.state ??
        "not_started") as WorkflowStepSnapshot["state"],
      criteria: {},
    };

    stepEntry.workflowStepId = workflowStep.id;
    stepEntry.state = (workflowStep.state ??
      "not_started") as WorkflowStepSnapshot["state"];

    const criteriaRecords = workflowStep.schedule_workflow_criteria || [];

    criteriaRecords.forEach((criterionRecord: any) => {
      const criterionRelation =
        criterionRecord.schedule_rulebook_step_criteria as any;
      const criterionSlug =
        (Array.isArray(criterionRelation)
          ? criterionRelation[0]
          : criterionRelation
        )?.slug;
      if (!criterionSlug) {
        return;
      }

      stepEntry.criteria[criterionSlug] = {
        recordId: criterionRecord.id,
        workflowStepId: workflowStep.id,
        rulebookCriterionId: criterionRecord.rulebook_criterionid,
        status: (criterionRecord.status ??
          "pending") as WorkflowCriterionSnapshot["status"],
        value: parseEvidenceValue(criterionRecord.evidence_value),
        approvedBy: criterionRecord.approved_by,
        approvedAt: criterionRecord.approved_at,
      };
    });

    snapshot[stepSlug] = stepEntry;
  });

  return snapshot;
}

export async function upsertWorkflowCriterionState(params: {
  recordId?: string;
  workflowStepId: string;
  rulebookCriterionId: string;
  status: "pending" | "satisfied" | "rejected";
  value?: number | string | boolean;
}): Promise<WorkflowCriterionSnapshot | null> {
  const payload: Record<string, unknown> = {
    workflow_stepid: params.workflowStepId,
    rulebook_criterionid: params.rulebookCriterionId,
    status: params.status,
    evidence_value:
      params.value !== undefined
        ? JSON.stringify({ value: params.value })
        : null,
  };

  if (params.recordId) {
    payload.id = params.recordId;
  }

  const { data, error } = await supabase
    .from("schedule_workflow_criteria")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, workflow_stepid, rulebook_criterionid, status, evidence_value, approved_by, approved_at",
    )
    .single();

  if (error) {
    logger.error("Failed to upsert workflow criterion", {
      error,
      tags: ["error"],
    });
    return null;
  }

  return {
    recordId: data.id,
    workflowStepId: data.workflow_stepid,
    rulebookCriterionId: data.rulebook_criterionid,
    status: (data.status ?? "pending") as WorkflowCriterionSnapshot["status"],
    value: parseEvidenceValue(data.evidence_value),
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
  };
}

export async function setWorkflowCriterionApproval(params: {
  recordId: string;
  approved: boolean;
  actorId?: string;
}): Promise<WorkflowCriterionSnapshot | null> {
  const payload: Record<string, unknown> = {
    id: params.recordId,
    approved_by: params.approved ? (params.actorId ?? null) : null,
    approved_at: params.approved ? new Date().toISOString() : null,
    status: params.approved ? "satisfied" : "pending",
  };

  const { data, error } = await supabase
    .from("schedule_workflow_criteria")
    .update(payload)
    .eq("id", params.recordId)
    .select(
      "id, workflow_stepid, rulebook_criterionid, status, evidence_value, approved_by, approved_at",
    )
    .single();

  if (error) {
    logger.error("Failed to update approval status", {
      error,
      tags: ["error"],
    });
    return null;
  }

  return {
    recordId: data.id,
    workflowStepId: data.workflow_stepid,
    rulebookCriterionId: data.rulebook_criterionid,
    status: (data.status ?? "pending") as WorkflowCriterionSnapshot["status"],
    value: parseEvidenceValue(data.evidence_value),
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
  };
}

async function ensureWorkflowSteps(
  rulebook: ScheduleRulebook,
  workflowId: string,
) {
  const rulebookStepIds = rulebook.steps
    .map((step) => step.recordId)
    .filter(Boolean) as string[];

  if (rulebookStepIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("schedule_workflow_steps")
    .select("rulebook_stepid")
    .eq("workflowid", workflowId);

  if (error) {
    logger.error("Failed to check workflow steps", { error, tags: ["error"] });
    return;
  }

  const existing = new Set(
    (data || []).map((row: any) => row.rulebook_stepid),
  );

  const missing = rulebookStepIds.filter((id) => !existing.has(id));
  if (missing.length === 0) {
    return;
  }

  const inserts = missing.map((rulebookStepId) => ({
    workflowid: workflowId,
    rulebook_stepid: rulebookStepId,
    state: "not_started",
  }));

  const { error: insertError } = await supabase
    .from("schedule_workflow_steps")
    .insert(inserts);
  if (insertError) {
    logger.error("Failed to insert workflow steps", {
      error: insertError,
      tags: ["error"],
    });
  }
}

function parseEvidenceValue(
  value: unknown,
): number | string | boolean | undefined {
  if (!value) {
    return undefined;
  }

  try {
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      return parsed?.value ?? parsed;
    }

    if (typeof value === "object" && value !== null) {
      // @ts-expect-error Postgrest may already return JSON object
      return value.value ?? value;
    }
  } catch (error) {
    logger.warn("Failed to parse evidence value", { error, tags: ["warning"] });
  }
  return undefined;
}

export function deriveDefaultValue(
  criterion: StepCriterion,
): number | string | boolean | undefined {
  switch (criterion.evidenceType) {
    case "numeric":
      return criterion.targetValue ?? 0;
    case "checkbox":
    case "approval":
      return true;
    default:
      return undefined;
  }
}
