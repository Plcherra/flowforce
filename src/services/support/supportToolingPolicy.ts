export const SUPPORT_TOOL_ACTIONS = [
  "tenant_diagnostics",
  "repair_onboarding_baseline",
] as const;

export type SupportToolAction = (typeof SUPPORT_TOOL_ACTIONS)[number];

export const SUPPORT_TOOL_STATUSES = [
  "started",
  "succeeded",
  "failed",
  "blocked",
] as const;

export type SupportToolStatus = (typeof SUPPORT_TOOL_STATUSES)[number];

export const SUPPORT_IMPERSONATION_DECISION = {
  status: "blocked",
  decision:
    "FlowForce v1 does not allow support staff to impersonate tenant users.",
  replacement:
    "Use read-only diagnostics, audited repair actions, and tenant-admin screen sharing when needed.",
  revisitWhen:
    "A later enterprise support phase can add approval-based session delegation with tenant consent, time limits, and immutable audit logs.",
} as const;

export const SUPPORT_TENANT_HEALTH_CHECKS = [
  "company",
  "ownerprofile",
  "owner_membership",
  "system_settings",
  "company_roles",
  "setup_audit_event",
  "billing_state",
  "lifecycle_state",
  "legal_holds",
] as const;

export type SupportTenantHealthCheck =
  (typeof SUPPORT_TENANT_HEALTH_CHECKS)[number];
