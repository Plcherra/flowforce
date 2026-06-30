import type { AIContextSnapshot, AIContextSnapshotModule } from "./aiContextLayer";
import { buildAIPromptContractInput, validateAIPromptOutput } from "./aiPromptContracts";

export type AISchedulingSuggestionType =
  | "coverage_gap"
  | "understaffing"
  | "overstaffing"
  | "replacement_review"
  | "labor_cost_review"
  | "no_action";

export type AISchedulingSuggestionStatus = "pending_review" | "approved" | "rejected";
export type AISchedulingSuggestionPriority = "low" | "medium" | "high" | "critical";

export interface AISchedulingSuggestion {
  type: AISchedulingSuggestionType;
  title: string;
  rationale: string;
  priority: AISchedulingSuggestionPriority;
  suggestedActionType: "request_review" | "draft_schedule_change";
  evidenceRoute: string;
  requiresHumanApproval: true;
  writesAllowed: false;
}

export interface AISchedulingSuggestionRow {
  id: string;
  company_id: string;
  prompt_key: "scheduling_assistant";
  status: AISchedulingSuggestionStatus;
  suggestion_type: AISchedulingSuggestionType;
  priority: AISchedulingSuggestionPriority;
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

const schedulingRoute = "/app/enhanced-scheduling";
const employeeRoute = "/app/employees";
const reportsRoute = "/app/reports";

const numberFromSummary = (module: AIContextSnapshotModule | undefined, key: string) => {
  const value = module?.summary?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export function buildSchedulingEvidence(snapshot: AIContextSnapshot) {
  return [
    {
      module: "scheduling",
      metric: "unassigned_shifts",
      value: snapshot.modules.scheduling.summary.unassigned_shifts ?? 0,
      route: schedulingRoute,
      freshness_at: snapshot.modules.scheduling.freshness_at,
    },
    {
      module: "scheduling",
      metric: "required_headcount",
      value: snapshot.modules.scheduling.summary.required_headcount ?? 0,
      route: schedulingRoute,
      freshness_at: snapshot.modules.scheduling.freshness_at,
    },
    {
      module: "employees",
      metric: "active_employees",
      value: snapshot.modules.employees.summary.active_employees ?? 0,
      route: employeeRoute,
      freshness_at: snapshot.modules.employees.freshness_at,
    },
    {
      module: "cost",
      metric: "labor_cost",
      value: snapshot.modules.cost.summary.labor_cost ?? 0,
      route: reportsRoute,
      freshness_at: snapshot.modules.cost.freshness_at,
    },
  ];
}

export function buildSchedulingSuggestions(snapshot: AIContextSnapshot): AISchedulingSuggestion[] {
  const scheduling = snapshot.modules.scheduling;
  const employees = snapshot.modules.employees;
  const cost = snapshot.modules.cost;

  const scheduledShifts = numberFromSummary(scheduling, "scheduled_shifts");
  const unassignedShifts = numberFromSummary(scheduling, "unassigned_shifts");
  const requiredHeadcount = numberFromSummary(scheduling, "required_headcount");
  const activeEmployees = numberFromSummary(employees, "active_employees");
  const laborCost = numberFromSummary(cost, "labor_cost");
  const suggestions: AISchedulingSuggestion[] = [];

  if (unassignedShifts > 0) {
    suggestions.push({
      type: "coverage_gap",
      title: "Review open shift coverage",
      rationale: `${unassignedShifts} scheduled shift${unassignedShifts === 1 ? "" : "s"} are not assigned.`,
      priority: unassignedShifts >= 3 ? "high" : "medium",
      suggestedActionType: "request_review",
      evidenceRoute: schedulingRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (requiredHeadcount > scheduledShifts && requiredHeadcount > 0) {
    suggestions.push({
      type: "understaffing",
      title: "Review possible understaffing",
      rationale: `Required headcount (${requiredHeadcount}) is higher than scheduled shifts (${scheduledShifts}).`,
      priority: requiredHeadcount - scheduledShifts >= 3 ? "high" : "medium",
      suggestedActionType: "draft_schedule_change",
      evidenceRoute: schedulingRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (scheduledShifts > requiredHeadcount && requiredHeadcount > 0) {
    suggestions.push({
      type: "overstaffing",
      title: "Review possible overstaffing",
      rationale: `Scheduled shifts (${scheduledShifts}) exceed required headcount (${requiredHeadcount}).`,
      priority: scheduledShifts - requiredHeadcount >= 3 ? "medium" : "low",
      suggestedActionType: "request_review",
      evidenceRoute: schedulingRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (scheduledShifts > 0 && activeEmployees === 0) {
    suggestions.push({
      type: "replacement_review",
      title: "Review replacement coverage",
      rationale: "Scheduled shifts exist but no active employees are visible in the tenant context.",
      priority: "critical",
      suggestedActionType: "request_review",
      evidenceRoute: employeeRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (laborCost > 0 && scheduledShifts > 0 && laborCost / scheduledShifts >= 250) {
    suggestions.push({
      type: "labor_cost_review",
      title: "Review labor cost per shift",
      rationale: "Recent labor cost per scheduled shift is above the review threshold.",
      priority: "medium",
      suggestedActionType: "request_review",
      evidenceRoute: reportsRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      type: "no_action",
      title: "No scheduling action needed",
      rationale: "No immediate coverage, staffing, replacement, or labor-cost scheduling risk was detected.",
      priority: "low",
      suggestedActionType: "request_review",
      evidenceRoute: schedulingRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  return suggestions.slice(0, 8);
}

export function buildSchedulingAssistantDraft(snapshot: AIContextSnapshot) {
  const suggestions = buildSchedulingSuggestions(snapshot);
  const evidence = buildSchedulingEvidence(snapshot);
  const activeSuggestions = suggestions.filter((suggestion) => suggestion.type !== "no_action");
  const contractEvidence = evidence.map((item) => ({
    module: item.module,
    metric: item.metric,
    value: item.value,
    freshness_at: item.freshness_at,
  }));

  return {
    contract_version: "2026-05-29" as const,
    prompt_key: "scheduling_assistant" as const,
    generated_at: new Date().toISOString(),
    status: activeSuggestions.length > 0 ? ("ok" as const) : ("no_action" as const),
    summary:
      activeSuggestions.length > 0
        ? `${activeSuggestions.length} scheduling suggestion${activeSuggestions.length === 1 ? "" : "s"} need manager review.`
        : "No immediate scheduling action was detected from the current tenant context.",
    confidence: activeSuggestions.length > 0 ? 0.76 : 0.63,
    evidence: contractEvidence,
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
      blocked_data_classes_observed: [],
    },
    staffing_risks: activeSuggestions.map((suggestion) => ({
      risk: suggestion.rationale,
      severity: suggestion.priority,
      affected_window: "current schedule context",
    })),
    shift_suggestions: suggestions.map((suggestion) => ({
      suggestion: suggestion.title,
      expected_impact: suggestion.rationale,
    })),
  };
}

export function buildValidatedSchedulingAssistant(snapshot: AIContextSnapshot) {
  const promptInput = buildAIPromptContractInput("scheduling_assistant", snapshot);
  const draft = buildSchedulingAssistantDraft(snapshot);
  const validation = validateAIPromptOutput("scheduling_assistant", draft);

  return {
    promptInput,
    evidence: buildSchedulingEvidence(snapshot),
    suggestions: buildSchedulingSuggestions(snapshot),
    validation,
  };
}

export function isSchedulingSuggestionSafe(row: AISchedulingSuggestionRow) {
  return (
    row.prompt_key === "scheduling_assistant" &&
    row.approval_required === true &&
    row.direct_write_executed === false &&
    row.suggested_action?.writes_allowed === false &&
    row.suggested_action?.requires_human_approval === true
  );
}
