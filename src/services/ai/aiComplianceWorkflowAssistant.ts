import type { AIContextSnapshot, AIContextSnapshotModule } from "./aiContextLayer";
import { buildAIPromptContractInput, validateAIPromptOutput } from "./aiPromptContracts";

export type AIComplianceWorkflowSuggestionType =
  | "overdue_workflow"
  | "failed_checklist_pattern"
  | "corrective_task"
  | "training_followup"
  | "no_action";

export type AIComplianceWorkflowSuggestionStatus = "pending_review" | "approved" | "rejected";
export type AIComplianceWorkflowSuggestionPriority = "low" | "medium" | "high" | "critical";

export interface AIComplianceWorkflowSuggestion {
  type: AIComplianceWorkflowSuggestionType;
  title: string;
  rationale: string;
  priority: AIComplianceWorkflowSuggestionPriority;
  suggestedActionType: "request_review" | "create_task" | "draft_training_followup";
  evidenceRoute: string;
  requiresHumanApproval: true;
  writesAllowed: false;
}

export interface AIComplianceWorkflowSuggestionRow {
  id: string;
  company_id: string;
  prompt_key: "compliance_assistant";
  status: AIComplianceWorkflowSuggestionStatus;
  suggestion_type: AIComplianceWorkflowSuggestionType;
  priority: AIComplianceWorkflowSuggestionPriority;
  title: string;
  rationale: string;
  suggested_action: Record<string, unknown>;
  evidence: Record<string, unknown>[];
  context_generated_at: string | null;
  approval_required: true;
  direct_write_executed: false;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
}

const operationsRoute = "/app/operations";
const tasksRoute = "/app/tasks";
const formsRoute = "/app/forms";
const learningRoute = "/app/learning-center";

const numberFromSummary = (module: AIContextSnapshotModule | undefined, key: string) => {
  const value = module?.summary?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export function buildComplianceWorkflowEvidence(snapshot: AIContextSnapshot) {
  return [
    {
      module: "tasks",
      metric: "overdue_tasks",
      value: snapshot.modules.tasks.summary.overdue_tasks ?? 0,
      route: tasksRoute,
      freshness_at: snapshot.modules.tasks.freshness_at,
    },
    {
      module: "tasks",
      metric: "high_priority_tasks",
      value: snapshot.modules.tasks.summary.high_priority_tasks ?? 0,
      route: tasksRoute,
      freshness_at: snapshot.modules.tasks.freshness_at,
    },
    {
      module: "forms",
      metric: "expiring_forms_soon",
      value: snapshot.modules.forms.summary.expiring_forms_soon ?? 0,
      route: formsRoute,
      freshness_at: snapshot.modules.forms.freshness_at,
    },
    {
      module: "employees",
      metric: "active_employees",
      value: snapshot.modules.employees.summary.active_employees ?? 0,
      route: learningRoute,
      freshness_at: snapshot.modules.employees.freshness_at,
    },
    {
      module: "operations",
      metric: "workflow_quality",
      value: "queried server-side",
      route: operationsRoute,
      freshness_at: snapshot.generated_at,
    },
  ];
}

export function buildComplianceWorkflowSuggestions(snapshot: AIContextSnapshot): AIComplianceWorkflowSuggestion[] {
  const tasks = snapshot.modules.tasks;
  const forms = snapshot.modules.forms;
  const employees = snapshot.modules.employees;
  const overdueTasks = numberFromSummary(tasks, "overdue_tasks");
  const highPriorityTasks = numberFromSummary(tasks, "high_priority_tasks");
  const expiringForms = numberFromSummary(forms, "expiring_forms_soon");
  const activeEmployees = numberFromSummary(employees, "active_employees");
  const suggestions: AIComplianceWorkflowSuggestion[] = [];

  if (overdueTasks > 0) {
    suggestions.push({
      type: "overdue_workflow",
      title: "Review overdue workflow discipline",
      rationale: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need manager follow-up.`,
      priority: overdueTasks >= 5 ? "high" : "medium",
      suggestedActionType: "create_task",
      evidenceRoute: tasksRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (highPriorityTasks > 0) {
    suggestions.push({
      type: "corrective_task",
      title: "Draft corrective task review",
      rationale: `${highPriorityTasks} high-priority task${highPriorityTasks === 1 ? "" : "s"} indicate operational corrective action may be needed.`,
      priority: highPriorityTasks >= 3 ? "high" : "medium",
      suggestedActionType: "create_task",
      evidenceRoute: tasksRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (expiringForms > 0) {
    suggestions.push({
      type: "failed_checklist_pattern",
      title: "Review compliance form follow-up",
      rationale: `${expiringForms} active form${expiringForms === 1 ? "" : "s"} expire soon and may affect compliance execution.`,
      priority: "medium",
      suggestedActionType: "request_review",
      evidenceRoute: formsRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (activeEmployees > 0 && (overdueTasks > 0 || highPriorityTasks > 0)) {
    suggestions.push({
      type: "training_followup",
      title: "Draft training follow-up",
      rationale: "Open execution pressure exists while active employees are available for targeted training follow-up.",
      priority: "medium",
      suggestedActionType: "draft_training_followup",
      evidenceRoute: learningRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      type: "no_action",
      title: "No compliance workflow action needed",
      rationale: "No immediate overdue workflow, failed checklist, corrective task, or training follow-up risk was detected.",
      priority: "low",
      suggestedActionType: "request_review",
      evidenceRoute: operationsRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  return suggestions.slice(0, 8);
}

function buildContractEvidence(snapshot: AIContextSnapshot) {
  return buildComplianceWorkflowEvidence(snapshot).map((item) => ({
    module: item.module,
    metric: item.metric,
    value: item.value,
    freshness_at: item.freshness_at,
  }));
}

export function buildComplianceWorkflowAssistantDraft(snapshot: AIContextSnapshot) {
  const suggestions = buildComplianceWorkflowSuggestions(snapshot);
  const activeSuggestions = suggestions.filter((suggestion) => suggestion.type !== "no_action");

  return {
    contract_version: "2026-05-29" as const,
    prompt_key: "compliance_assistant" as const,
    generated_at: new Date().toISOString(),
    status: activeSuggestions.length > 0 ? ("ok" as const) : ("no_action" as const),
    summary:
      activeSuggestions.length > 0
        ? `${activeSuggestions.length} compliance workflow suggestion${activeSuggestions.length === 1 ? "" : "s"} need manager review.`
        : "No immediate compliance workflow action was detected from the current tenant context.",
    confidence: activeSuggestions.length > 0 ? 0.75 : 0.62,
    evidence: buildContractEvidence(snapshot),
    recommendations: suggestions.map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      suggested_action_type: suggestion.suggestedActionType,
      requires_human_approval: true as const,
    })),
    safety: {
      requires_human_approval: true as const,
      writes_allowed: false as const,
      blockeddata_classes_observed: [],
    },
    workflow_risks: activeSuggestions.map((suggestion) => ({
      workflow_area: suggestion.type,
      risk: suggestion.rationale,
      severity: suggestion.priority,
    })),
    corrective_tasks: suggestions.map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      suggested_action_type: suggestion.suggestedActionType,
      requires_human_approval: true as const,
    })),
  };
}

export function buildValidatedComplianceWorkflowAssistant(snapshot: AIContextSnapshot) {
  const promptInput = buildAIPromptContractInput("compliance_assistant", snapshot);
  const draft = buildComplianceWorkflowAssistantDraft(snapshot);

  return {
    promptInput,
    evidence: buildComplianceWorkflowEvidence(snapshot),
    suggestions: buildComplianceWorkflowSuggestions(snapshot),
    validation: validateAIPromptOutput("compliance_assistant", draft),
  };
}

export function isComplianceWorkflowSuggestionSafe(row: AIComplianceWorkflowSuggestionRow) {
  return (
    row.prompt_key === "compliance_assistant" &&
    row.approval_required === true &&
    row.direct_write_executed === false &&
    row.suggested_action?.writes_allowed === false &&
    row.suggested_action?.requires_human_approval === true
  );
}
