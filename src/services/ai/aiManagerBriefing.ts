import type { AIContextSnapshot, AIContextSnapshotModule } from "./aiContextLayer";
import { buildAIPromptContractInput, validateAIPromptOutput } from "./aiPromptContracts";

export type ManagerBriefingRiskOwner = "manager" | "inventory" | "scheduler" | "compliance" | "team";
export type ManagerBriefingPriority = "low" | "medium" | "high" | "critical";

export interface ManagerBriefingEvidenceLink {
  label: string;
  module: keyof AIContextSnapshot["modules"] | "operations";
  metric: string;
  route: string;
  freshness_at: string;
}

export interface ManagerBriefingRisk {
  risk: string;
  priority: ManagerBriefingPriority;
  owner_hint: ManagerBriefingRiskOwner;
  evidence_route: string;
}

export interface ManagerBriefingRunRow {
  id: string;
  company_id: string;
  briefing_date: string;
  prompt_key: "manager_briefing";
  status: "generated" | "fallback";
  context_generated_at: string | null;
  output: Record<string, unknown>;
  evidence: ManagerBriefingEvidenceLink[];
  fallback_reason: string | null;
  generated_by: string | null;
  created_at: string;
}

const moduleRoutes: Record<keyof AIContextSnapshot["modules"] | "operations", string> = {
  scheduling: "/app/enhanced-scheduling",
  inventory: "/app/inventory",
  tasks: "/app/tasks",
  forms: "/app/forms",
  employees: "/app/employees",
  cost: "/app/reports",
  operations: "/app/operations",
};

const numberFromSummary = (module: AIContextSnapshotModule | undefined, key: string) => {
  const value = module?.summary?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const freshnessFrom = (module: AIContextSnapshotModule | undefined, fallback: string) =>
  module?.freshness_at || fallback;

const buildEvidence = (
  snapshot: AIContextSnapshot,
  moduleKey: keyof AIContextSnapshot["modules"],
  metric: string,
  label: string,
): ManagerBriefingEvidenceLink => ({
  label,
  module: moduleKey,
  metric,
  route: moduleRoutes[moduleKey],
  freshness_at: freshnessFrom(snapshot.modules[moduleKey], snapshot.generated_at),
});

export function buildManagerBriefingEvidence(snapshot: AIContextSnapshot) {
  return [
    buildEvidence(snapshot, "scheduling", "unassigned_shifts", "Open schedule coverage"),
    buildEvidence(snapshot, "inventory", "items_with_minimums", "Inventory setup risk"),
    buildEvidence(snapshot, "tasks", "overdue_tasks", "Overdue tasks"),
    {
      label: "Workflow exceptions",
      module: "operations" as const,
      metric: "open_workflow_exceptions",
      route: moduleRoutes.operations,
      freshness_at: snapshot.generated_at,
    },
    buildEvidence(snapshot, "forms", "expiring_forms_soon", "Forms needing attention"),
    buildEvidence(snapshot, "employees", "active_employees", "Team availability"),
    buildEvidence(snapshot, "cost", "total_operating_cost", "Operating cost signal"),
  ];
}

export function buildManagerBriefingRisks(snapshot: AIContextSnapshot): ManagerBriefingRisk[] {
  const risks: ManagerBriefingRisk[] = [];
  const scheduling = snapshot.modules.scheduling;
  const inventory = snapshot.modules.inventory;
  const tasks = snapshot.modules.tasks;
  const forms = snapshot.modules.forms;
  const employees = snapshot.modules.employees;
  const cost = snapshot.modules.cost;

  const unassignedShifts = numberFromSummary(scheduling, "unassigned_shifts");
  if (unassignedShifts > 0) {
    risks.push({
      risk: `${unassignedShifts} scheduled shift${unassignedShifts === 1 ? "" : "s"} still need coverage.`,
      priority: unassignedShifts >= 3 ? "high" : "medium",
      owner_hint: "scheduler",
      evidence_route: moduleRoutes.scheduling,
    });
  }

  const overdueTasks = numberFromSummary(tasks, "overdue_tasks");
  if (overdueTasks > 0) {
    risks.push({
      risk: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need manager follow-up.`,
      priority: overdueTasks >= 5 ? "high" : "medium",
      owner_hint: "manager",
      evidence_route: moduleRoutes.tasks,
    });
  }

  const activeEmployees = numberFromSummary(employees, "active_employees");
  const scheduledShifts = numberFromSummary(scheduling, "scheduled_shifts");
  if (scheduledShifts > 0 && activeEmployees === 0) {
    risks.push({
      risk: "Schedule exists but no active employees are visible in the AI context.",
      priority: "critical",
      owner_hint: "team",
      evidence_route: moduleRoutes.employees,
    });
  }

  const expiringForms = numberFromSummary(forms, "expiring_forms_soon");
  if (expiringForms > 0) {
    risks.push({
      risk: `${expiringForms} active form${expiringForms === 1 ? "" : "s"} expire soon.`,
      priority: "low",
      owner_hint: "compliance",
      evidence_route: moduleRoutes.forms,
    });
  }

  const itemsWithMinimums = numberFromSummary(inventory, "items_with_minimums");
  const activeItems = numberFromSummary(inventory, "active_items");
  if (activeItems > 0 && itemsWithMinimums === 0) {
    risks.push({
      risk: "Active inventory items do not have minimum stock thresholds configured.",
      priority: "medium",
      owner_hint: "inventory",
      evidence_route: moduleRoutes.inventory,
    });
  }

  const totalOperatingCost = numberFromSummary(cost, "total_operating_cost");
  const wasteCost = numberFromSummary(cost, "waste_cost");
  if (totalOperatingCost > 0 && wasteCost / totalOperatingCost >= 0.1) {
    risks.push({
      risk: "Waste cost is above 10% of recent operating cost.",
      priority: "high",
      owner_hint: "inventory",
      evidence_route: moduleRoutes.cost,
    });
  }

  return risks.slice(0, 8);
}

export function buildManagerBriefingDraft(snapshot: AIContextSnapshot) {
  const risks = buildManagerBriefingRisks(snapshot);
  const evidence = buildManagerBriefingEvidence(snapshot);

  const draft = {
    contract_version: "2026-05-29" as const,
    prompt_key: "manager_briefing" as const,
    generated_at: new Date().toISOString(),
    status: risks.length > 0 ? ("ok" as const) : ("no_action" as const),
    summary:
      risks.length > 0
        ? `${risks.length} operational risk${risks.length === 1 ? "" : "s"} need manager attention today.`
        : "No immediate operational risks were detected from the current tenant context.",
    confidence: risks.length > 0 ? 0.78 : 0.64,
    evidence: evidence.map((item) => ({
      module: item.module,
      metric: item.metric,
      value: item.module === "operations" ? null : snapshot.modules[item.module]?.summary?.[item.metric] ?? null,
      freshness_at: item.freshness_at,
    })),
    recommendations: risks.slice(0, 5).map((risk) => ({
      title: `Review ${risk.owner_hint} risk`,
      rationale: risk.risk,
      priority: risk.priority,
      suggested_action_type: "request_review" as const,
      requires_human_approval: true as const,
    })),
    safety: {
      requires_human_approval: true as const,
      writes_allowed: false as const,
      blockeddata_classes_observed: [],
    },
    briefing_sections: [
      {
        heading: "Today",
        bullets:
          risks.length > 0
            ? risks.slice(0, 5).map((risk) => risk.risk)
            : ["No immediate risk surfaced from staffing, inventory, tasks, forms, employee, or cost summaries."],
      },
      {
        heading: "Evidence",
        bullets: evidence.slice(0, 5).map((item) => `${item.label}: ${item.route}`),
      },
    ],
    top_risks: risks.map((risk) => ({
      risk: risk.risk,
      priority: risk.priority,
      owner_hint: risk.owner_hint,
    })),
    next_actions: risks.slice(0, 5).map((risk) => ({
      title: `Review ${risk.owner_hint} risk`,
      rationale: risk.risk,
      priority: risk.priority,
      suggested_action_type: "request_review" as const,
      requires_human_approval: true as const,
    })),
  };

  return draft;
}

export function buildValidatedManagerBriefing(snapshot: AIContextSnapshot) {
  const promptInput = buildAIPromptContractInput("manager_briefing", snapshot);
  const draft = buildManagerBriefingDraft(snapshot);
  const validation = validateAIPromptOutput("manager_briefing", draft);

  return {
    promptInput,
    evidence: buildManagerBriefingEvidence(snapshot),
    validation,
  };
}

export function isManagerBriefingRunSafe(row: ManagerBriefingRunRow) {
  const safety = row.output?.safety as { writes_allowed?: unknown; requires_human_approval?: unknown } | undefined;

  return (
    row.prompt_key === "manager_briefing" &&
    Boolean(row.context_generated_at) &&
    Array.isArray(row.evidence) &&
    safety?.writes_allowed === false &&
    safety?.requires_human_approval === true
  );
}
