export type AIContextModuleKey =
  | "scheduling"
  | "inventory"
  | "tasks"
  | "forms"
  | "employees"
  | "cost";

export interface AIContextModuleSummary {
  company_id: string;
  module_key: AIContextModuleKey;
  summary: Record<string, unknown>;
  freshness_at: string;
  redaction: Record<string, string>;
  source_tables: string[];
}

export interface AIContextReadinessRow {
  company_id: string;
  module_count: number;
  has_scheduling: boolean;
  has_inventory: boolean;
  has_tasks: boolean;
  has_forms: boolean;
  has_employees: boolean;
  has_cost: boolean;
  allmodules_freshness_declared: boolean;
  redaction_enforced: boolean;
  ready_for_prompt_contracts: boolean;
}

export interface AIContextSnapshotModule {
  summary: Record<string, unknown>;
  freshness_at: string;
  redaction: Record<string, string>;
  source_tables: string[];
}

export interface AIContextSnapshot {
  company_id: string;
  generated_at: string;
  module_count: number;
  redaction: Record<string, string>;
  modules: Record<AIContextModuleKey, AIContextSnapshotModule>;
}

export const aiContextModuleKeys: AIContextModuleKey[] = [
  "scheduling",
  "inventory",
  "tasks",
  "forms",
  "employees",
  "cost",
];

export const aiContextBlockedDataClasses = [
  "raw_pii",
  "cross_tenantdata",
  "secret_material",
  "payroll_detail",
] as const;

export const aiContextRedactionRules = {
  raw_pii: "blocked",
  cross_tenantdata: "blocked",
  secret_material: "blocked",
  payroll_detail: "blocked",
  names: "excluded",
  emails: "excluded",
  phones: "excluded",
  addresses: "excluded",
  free_text: "excluded_or_aggregated",
  financial_values: "aggregated",
} as const;

export const aiContextChecks = [
  "AI context uses tenant-scoped summaries instead of raw record dumps.",
  "Scheduling, inventory, tasks, forms, employees, and cost modules expose stable summary objects.",
  "Every module declares freshness_at for stale-context detection.",
  "Raw PII, payroll detail, secret material, and cross-tenant data are blocked from prompt context.",
  "get_ai_context_snapshot(company_id) requires the phase 07.01 governance baseline.",
] as const;

export function isAIContextReady(row: AIContextReadinessRow) {
  return (
    row.module_count === aiContextModuleKeys.length &&
    row.has_scheduling &&
    row.has_inventory &&
    row.has_tasks &&
    row.has_forms &&
    row.has_employees &&
    row.has_cost &&
    row.allmodules_freshness_declared &&
    row.redaction_enforced &&
    row.ready_for_prompt_contracts
  );
}

export function hasCompleteAIContextSnapshot(snapshot: AIContextSnapshot) {
  return aiContextModuleKeys.every((moduleKey) => {
    const module = snapshot.modules[moduleKey];
    return Boolean(
      module?.summary &&
        module.freshness_at &&
        module.redaction?.raw_pii === "blocked" &&
        module.redaction?.cross_tenantdata === "blocked",
    );
  });
}
