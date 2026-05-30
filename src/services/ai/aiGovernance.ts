export type AIGovernanceActionLevel =
  | "read_only_insight"
  | "suggested_action"
  | "approved_action"
  | "automated_action";

export type AIGovernanceDataClass =
  | "tenant_operational_summary"
  | "aggregated_financial_metrics"
  | "workflow_exception_metadata"
  | "schedule_coverage_metadata"
  | "inventory_cost_metrics"
  | "employee_profile_minimum"
  | "raw_pii"
  | "payroll_detail"
  | "secret_material"
  | "cross_tenant_data";

export interface AIGovernancePolicy {
  policyKey: string;
  actionLevel: AIGovernanceActionLevel;
  label: string;
  description: string;
  requiredPermissions: string[];
  allowedModules: string[];
  allowedDataClasses: AIGovernanceDataClass[];
  blockedDataClasses: AIGovernanceDataClass[];
  requiresHumanApproval: boolean;
  allowsBackgroundAutomation: boolean;
  auditEvent: string;
  retention: "standard" | "extended";
}

export interface AIGovernanceReadinessRow {
  company_id: string;
  governance_policies: number;
  has_read_only_insight: boolean;
  has_suggested_action: boolean;
  has_approved_action: boolean;
  has_automated_action: boolean;
  blocks_sensitive_data: boolean;
  has_audit_events: boolean;
  ready_for_ai_phase_two: boolean;
}

export const aiGovernanceActionLevels: AIGovernanceActionLevel[] = [
  "read_only_insight",
  "suggested_action",
  "approved_action",
  "automated_action",
];

export const aiGovernancePolicies: AIGovernancePolicy[] = [
  {
    policyKey: "read_only_insight",
    actionLevel: "read_only_insight",
    label: "Read-Only Insight",
    description:
      "AI may summarize tenant-scoped operational facts without creating product records.",
    requiredPermissions: ["viewAIInsights", "ai.insights.view"],
    allowedModules: ["operations", "inventory", "scheduling", "tasks", "forms", "costing"],
    allowedDataClasses: [
      "tenant_operational_summary",
      "aggregated_financial_metrics",
      "workflow_exception_metadata",
      "schedule_coverage_metadata",
      "inventory_cost_metrics",
    ],
    blockedDataClasses: ["raw_pii", "payroll_detail", "secret_material", "cross_tenant_data"],
    requiresHumanApproval: false,
    allowsBackgroundAutomation: false,
    auditEvent: "ai.insight.generated",
    retention: "standard",
  },
  {
    policyKey: "suggested_action",
    actionLevel: "suggested_action",
    label: "Suggested Action",
    description:
      "AI may draft recommended work, schedule changes, or follow-ups, but cannot write them directly.",
    requiredPermissions: ["viewAIInsights", "ai.actions.suggest"],
    allowedModules: ["operations", "inventory", "scheduling", "tasks", "forms", "costing"],
    allowedDataClasses: [
      "tenant_operational_summary",
      "workflow_exception_metadata",
      "schedule_coverage_metadata",
      "inventory_cost_metrics",
      "employee_profile_minimum",
    ],
    blockedDataClasses: ["raw_pii", "payroll_detail", "secret_material", "cross_tenant_data"],
    requiresHumanApproval: true,
    allowsBackgroundAutomation: false,
    auditEvent: "ai.suggestion.created",
    retention: "extended",
  },
  {
    policyKey: "approved_action",
    actionLevel: "approved_action",
    label: "Approved Action",
    description:
      "AI-originated writes may execute only after a permitted user approves the exact scoped action.",
    requiredPermissions: ["ai.actions.approve"],
    allowedModules: ["operations", "inventory", "scheduling", "tasks", "forms"],
    allowedDataClasses: [
      "tenant_operational_summary",
      "workflow_exception_metadata",
      "schedule_coverage_metadata",
      "inventory_cost_metrics",
      "employee_profile_minimum",
    ],
    blockedDataClasses: ["raw_pii", "payroll_detail", "secret_material", "cross_tenant_data"],
    requiresHumanApproval: true,
    allowsBackgroundAutomation: false,
    auditEvent: "ai.action.approved",
    retention: "extended",
  },
  {
    policyKey: "automated_action",
    actionLevel: "automated_action",
    label: "Automated Action",
    description:
      "AI automation is restricted to pre-approved, low-risk workflows with tenant budget and audit controls.",
    requiredPermissions: ["ai.actions.automate", "ai.governance.manage"],
    allowedModules: ["operations", "tasks", "notifications"],
    allowedDataClasses: [
      "tenant_operational_summary",
      "workflow_exception_metadata",
      "schedule_coverage_metadata",
    ],
    blockedDataClasses: ["raw_pii", "payroll_detail", "secret_material", "cross_tenant_data"],
    requiresHumanApproval: true,
    allowsBackgroundAutomation: true,
    auditEvent: "ai.automation.executed",
    retention: "extended",
  },
];

export const aiGovernanceChecks = [
  "AI action levels are explicit: read-only insight, suggested action, approved action, automated action.",
  "AI permissions separate viewing, suggesting, approving, automating, auditing, and governance changes.",
  "AI writes require tenant scope, permission checks, approval state, and audit events.",
  "AI context blocks raw PII, payroll detail, secret material, and cross-tenant data.",
  "OpenAI and model provider keys remain server-only.",
] as const;

export function isAIGovernanceReady(row: AIGovernanceReadinessRow) {
  return (
    row.governance_policies >= aiGovernanceActionLevels.length &&
    row.has_read_only_insight &&
    row.has_suggested_action &&
    row.has_approved_action &&
    row.has_automated_action &&
    row.blocks_sensitive_data &&
    row.has_audit_events &&
    row.ready_for_ai_phase_two
  );
}
