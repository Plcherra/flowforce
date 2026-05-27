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
