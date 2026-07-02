import type { SystemSettings } from "@/types/system-settings";

export interface SettingsReadinessSummary {
  completionScore: number;
  completedChecks: number;
  totalChecks: number;
  cards: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
    status: "ready" | "watch" | "blocked";
  }>;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

const hasText = (value: string | null | undefined) =>
  Boolean(value?.trim().length);

const statusFromBoolean = (value: boolean): "ready" | "watch" =>
  value ? "ready" : "watch";

export function buildSettingsReadinessSummary(
  settings: SystemSettings,
): SettingsReadinessSummary {
  const integrations = settings.integrations.connections ?? [];
  const connectedIntegrations = integrations.filter(
    (connection) => connection.status === "connected",
  );
  const erroredIntegrations = integrations.filter(
    (connection) => connection.status === "error",
  );
  const providers = Object.values(settings.integrations.providers ?? {});
  const configuredProviders = providers.filter(
    (provider) => provider.status !== "disconnected",
  );
  const tenant = settings.adminConfig.tenantManagement;
  const ai = settings.adminConfig.aiCopilot;

  const checks = [
    hasText(settings.general.companyName),
    hasText(settings.general.contactEmail),
    hasText(settings.localization.timezone),
    hasText(settings.localization.currency),
    settings.security.rowLevelSecurity.enforced,
    settings.security.enforceForAdmins,
    settings.security.passwordPolicy.minLength >= 12,
    settings.notifications.deliveryChannels.length > 0,
    Boolean(tenant?.primaryOwnerEmail),
    Boolean(tenant?.billingEmail),
    Number(tenant?.activeSeats ?? 0) <= Number(tenant?.maxSeats ?? 0),
    configuredProviders.length > 0,
    Boolean(ai?.lastAuditAt) || ai?.automationLevel === "suggestion",
  ];
  const completedChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;
  const completionScore = Math.round((completedChecks / totalChecks) * 100);

  const cards: SettingsReadinessSummary["cards"] = [
    {
      id: "company-profile",
      label: "Company profile",
      value: hasText(settings.general.companyName) ? "Ready" : "Missing",
      detail: settings.general.contactEmail ?? "No contact email",
      status: statusFromBoolean(
        hasText(settings.general.companyName) &&
          hasText(settings.general.contactEmail),
      ),
    },
    {
      id: "security",
      label: "Security",
      value: settings.security.rowLevelSecurity.enforced
        ? "RLS enforced"
        : "RLS off",
      detail: `MFA for admins ${settings.security.enforceForAdmins ? "on" : "off"}`,
      status: settings.security.rowLevelSecurity.enforced
        ? statusFromBoolean(settings.security.enforceForAdmins)
        : "blocked",
    },
    {
      id: "integrations",
      label: "Integrations",
      value: String(connectedIntegrations.length),
      detail: `${configuredProviders.length} providers configured`,
      status:
        erroredIntegrations.length > 0
          ? "blocked"
          : statusFromBoolean(configuredProviders.length > 0),
    },
    {
      id: "billing-admin",
      label: "Billing admin",
      value: tenant?.billingStatus ?? "unset",
      detail: `${tenant?.activeSeats ?? 0}/${tenant?.maxSeats ?? 0} seats`,
      status: statusFromBoolean(
        Boolean(tenant?.primaryOwnerEmail) &&
          Boolean(tenant?.billingEmail) &&
          Number(tenant?.activeSeats ?? 0) <= Number(tenant?.maxSeats ?? 0),
      ),
    },
    {
      id: "ai-governance",
      label: "AI governance",
      value: ai?.enabled ? "Enabled" : "Off",
      detail: `${ai?.automationLevel ?? "suggestion"} mode`,
      status:
        ai?.automationLevel === "autopilot" && !ai?.lastAuditAt
          ? "blocked"
          : "ready",
    },
  ];

  const reviewItems = [
    ...(!hasText(settings.general.contactEmail)
      ? [
          {
            id: "contact-email",
            label: "Missing company contact",
            detail: "Add a support/contact email in General settings.",
            severity: "warning" as const,
          },
        ]
      : []),
    ...(!settings.security.rowLevelSecurity.enforced
      ? [
          {
            id: "rls-disabled",
            label: "Row-level security disabled",
            detail: "Tenant-safe exports and analytics require RLS enforcement.",
            severity: "critical" as const,
          },
        ]
      : []),
    ...(!settings.security.enforceForAdmins
      ? [
          {
            id: "admin-mfa",
            label: "Admin MFA not enforced",
            detail: "Owners and admins should be required to use MFA.",
            severity: "warning" as const,
          },
        ]
      : []),
    ...(Number(tenant?.activeSeats ?? 0) > Number(tenant?.maxSeats ?? 0)
      ? [
          {
            id: "seat-overage",
            label: "Seat limit exceeded",
            detail: "Active seats are above the configured billing limit.",
            severity: "critical" as const,
          },
        ]
      : []),
    ...(erroredIntegrations.length > 0
      ? [
          {
            id: "integration-errors",
            label: "Integration errors",
            detail: `${erroredIntegrations.length} connection(s) need repair.`,
            severity: "critical" as const,
          },
        ]
      : []),
    ...(ai?.automationLevel === "autopilot" && !ai?.lastAuditAt
      ? [
          {
            id: "ai-autopilot-audit",
            label: "Autopilot needs audit review",
            detail: "Record an AI governance audit before enabling autopilot.",
            severity: "warning" as const,
          },
        ]
      : []),
  ];

  return {
    completionScore,
    completedChecks,
    totalChecks,
    cards,
    reviewItems,
  };
}
