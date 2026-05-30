export const AUDIT_CATEGORIES = [
  "onboarding",
  "user",
  "permission",
  "settings",
  "billing",
  "integration",
  "ai",
  "data",
  "security",
  "support",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export type AuditSeverity = "info" | "warning" | "critical";

export type AuditEventDefinition = {
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  retention: "standard" | "extended";
};

export const AUDIT_ACTIONS = {
  onboardingSetupVerified: "company.setup_verified",
  inviteCreated: "invite.created",
  employeeInviteCreated: "employee.invite.created",
  employeeInviteEmailFailed: "employee.invite.email_failed",
  userRoleUpdated: "user.role_updated",
  userStatusUpdated: "user.status_updated",
  permissionOverridesUpdated: "permission.overrides_updated",
  settingsUpdated: "system_settings.updated",
  supportTenantDiagnosticsViewed: "support.tenant_diagnostics_viewed",
  supportTenantRepairExecuted: "support.tenant_repair_executed",
  aiInsightGenerated: "ai.insight.generated",
  aiSuggestionCreated: "ai.suggestion.created",
  aiActionApproved: "ai.action.approved",
  aiAutomationExecuted: "ai.automation.executed",
  aiGovernanceUpdated: "ai.governance.updated",
  aiManagerBriefingGenerated: "ai.manager_briefing.generated",
  aiSchedulingSuggestionCreated: "ai.scheduling_suggestion.created",
  aiSchedulingSuggestionApproved: "ai.scheduling_suggestion.approved",
  aiSchedulingSuggestionRejected: "ai.scheduling_suggestion.rejected",
  aiInventoryWasteSuggestionCreated: "ai.inventory_waste_suggestion.created",
  aiInventoryWasteSuggestionApproved: "ai.inventory_waste_suggestion.approved",
  aiInventoryWasteSuggestionRejected: "ai.inventory_waste_suggestion.rejected",
  aiComplianceWorkflowSuggestionCreated:
    "ai.compliance_workflow_suggestion.created",
  aiComplianceWorkflowSuggestionApproved:
    "ai.compliance_workflow_suggestion.approved",
  aiComplianceWorkflowSuggestionRejected:
    "ai.compliance_workflow_suggestion.rejected",
  aiRecommendationFeedbackRecorded: "ai.recommendation_feedback.recorded",
  aiUsageEventRecorded: "ai.usage_event.recorded",
  aiUsageEventDegraded: "ai.usage_event.degraded",
  aiBudgetControlUpdated: "ai.budget_control.updated",
  integrationCsvImportStarted: "integration.csv_import.started",
  integrationCsvImportValidated: "integration.csv_import.validated",
  integrationCsvImportCompleted: "integration.csv_import.completed",
  integrationCsvImportFailed: "integration.csv_import.failed",
  integrationCsvImportRolledBack: "integration.csv_import.rolled_back",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_EVENT_DEFINITIONS: AuditEventDefinition[] = [
  {
    action: AUDIT_ACTIONS.onboardingSetupVerified,
    category: "onboarding",
    severity: "info",
    description: "Tenant baseline setup was verified.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.inviteCreated,
    category: "user",
    severity: "info",
    description: "A pre-account invite was created.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.employeeInviteCreated,
    category: "user",
    severity: "info",
    description: "An employee invite was sent or refreshed.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.employeeInviteEmailFailed,
    category: "user",
    severity: "warning",
    description:
      "An employee invite record was created but email delivery failed.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.userRoleUpdated,
    category: "permission",
    severity: "critical",
    description: "A user's product role was changed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.userStatusUpdated,
    category: "user",
    severity: "warning",
    description: "A user's employment status was changed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.permissionOverridesUpdated,
    category: "permission",
    severity: "critical",
    description: "User permission overrides were changed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.settingsUpdated,
    category: "settings",
    severity: "warning",
    description:
      "System settings were changed, including billing, integration, AI, security, or company configuration.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.supportTenantDiagnosticsViewed,
    category: "support",
    severity: "warning",
    description: "Internal support diagnostics were viewed for a tenant.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.supportTenantRepairExecuted,
    category: "support",
    severity: "critical",
    description: "Internal support tooling repaired a tenant baseline.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiInsightGenerated,
    category: "ai",
    severity: "info",
    description: "AI generated a read-only tenant-scoped insight.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.aiSuggestionCreated,
    category: "ai",
    severity: "info",
    description: "AI created a suggested action awaiting user review.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiActionApproved,
    category: "ai",
    severity: "warning",
    description: "A permitted user approved an AI-originated action.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiAutomationExecuted,
    category: "ai",
    severity: "warning",
    description: "A pre-approved AI automation executed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiGovernanceUpdated,
    category: "ai",
    severity: "critical",
    description:
      "AI governance scopes, restrictions, or automation levels changed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiManagerBriefingGenerated,
    category: "ai",
    severity: "info",
    description:
      "AI generated a read-only manager briefing from tenant-scoped context.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.aiSchedulingSuggestionCreated,
    category: "ai",
    severity: "info",
    description:
      "AI created an approval-gated scheduling suggestion from tenant-scoped context.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiSchedulingSuggestionApproved,
    category: "ai",
    severity: "warning",
    description:
      "A manager approved an AI scheduling suggestion without allowing direct schedule writes.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiSchedulingSuggestionRejected,
    category: "ai",
    severity: "info",
    description: "A manager rejected an AI scheduling suggestion.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiInventoryWasteSuggestionCreated,
    category: "ai",
    severity: "info",
    description:
      "AI created an approval-gated inventory or waste suggestion from tenant-scoped context.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiInventoryWasteSuggestionApproved,
    category: "ai",
    severity: "warning",
    description:
      "A manager approved an AI inventory or waste suggestion without allowing direct operational writes.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiInventoryWasteSuggestionRejected,
    category: "ai",
    severity: "info",
    description: "A manager rejected an AI inventory or waste suggestion.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiComplianceWorkflowSuggestionCreated,
    category: "ai",
    severity: "info",
    description:
      "AI created an approval-gated compliance or workflow suggestion from tenant-scoped context.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiComplianceWorkflowSuggestionApproved,
    category: "ai",
    severity: "warning",
    description:
      "A manager approved an AI compliance or workflow suggestion without allowing direct operational writes.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiComplianceWorkflowSuggestionRejected,
    category: "ai",
    severity: "info",
    description: "A manager rejected an AI compliance or workflow suggestion.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiRecommendationFeedbackRecorded,
    category: "ai",
    severity: "info",
    description:
      "A manager recorded tenant-scoped feedback for an AI recommendation.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiUsageEventRecorded,
    category: "ai",
    severity: "info",
    description: "AI usage, token, latency, and cost telemetry was recorded.",
    retention: "standard",
  },
  {
    action: AUDIT_ACTIONS.aiUsageEventDegraded,
    category: "ai",
    severity: "warning",
    description:
      "AI usage degraded into failure, timeout, budget block, or fallback behavior.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.aiBudgetControlUpdated,
    category: "ai",
    severity: "critical",
    description:
      "A tenant AI model budget, retry, timeout, or enabled state was changed.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.integrationCsvImportStarted,
    category: "integration",
    severity: "info",
    description: "A tenant CSV migration import batch was started.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.integrationCsvImportValidated,
    category: "integration",
    severity: "info",
    description:
      "A tenant CSV migration import batch finished mapping and validation.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.integrationCsvImportCompleted,
    category: "integration",
    severity: "warning",
    description: "A tenant CSV migration import batch wrote mapped records.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.integrationCsvImportFailed,
    category: "integration",
    severity: "warning",
    description:
      "A tenant CSV migration import batch failed validation or write steps.",
    retention: "extended",
  },
  {
    action: AUDIT_ACTIONS.integrationCsvImportRolledBack,
    category: "integration",
    severity: "critical",
    description: "A tenant CSV migration import batch was rolled back.",
    retention: "extended",
  },
];

const definitionsByAction = new Map(
  AUDIT_EVENT_DEFINITIONS.map((definition) => [definition.action, definition]),
);

export function getAuditEventDefinition(action: string) {
  return definitionsByAction.get(action);
}

export function getAuditEventMetadata(action: string) {
  const definition = getAuditEventDefinition(action);
  if (!definition) {
    return {
      category: "data" satisfies AuditCategory,
      severity: "info" satisfies AuditSeverity,
      retention: "standard",
    };
  }

  return {
    category: definition.category,
    severity: definition.severity,
    retention: definition.retention,
  };
}
