export type IntegrationPriorityTier = "phase_1" | "phase_2" | "phase_3";
export type IntegrationMode = "import" | "export" | "sync" | "live_api";
export type IntegrationCredentialType =
  | "none"
  | "api_key"
  | "oauth"
  | "webhook_secret";

export type IntegrationStrategyTarget = {
  id: string;
  label: string;
  priorityTier: IntegrationPriorityTier;
  modes: IntegrationMode[];
  pilotValue: number;
  adoptionFriction: "low" | "medium" | "high";
  roiReason: string;
  firstDataObjects: string[];
  credentialType: IntegrationCredentialType;
};

export type IntegrationCredentialRule = {
  id: string;
  rule: string;
};

export type IntegrationRetryRule = {
  id: string;
  appliesTo: IntegrationMode[];
  rule: string;
};

export const integrationStrategyTargets: IntegrationStrategyTarget[] = [
  {
    id: "csv_migration_framework",
    label: "CSV migration framework",
    priorityTier: "phase_1",
    modes: ["import", "export"],
    pilotValue: 10,
    adoptionFriction: "low",
    roiReason:
      "Fastest path to move a pilot tenant into FlowForce without waiting for vendor APIs.",
    firstDataObjects: [
      "employees",
      "inventory_items",
      "suppliers",
      "schedules",
      "tasks",
    ],
    credentialType: "none",
  },
  {
    id: "workforce_platform_migration",
    label: "Workforce platform migration",
    priorityTier: "phase_1",
    modes: ["import"],
    pilotValue: 9,
    adoptionFriction: "medium",
    roiReason:
      "Reduces switching anxiety for teams replacing staff scheduling, tasks, messages, and forms.",
    firstDataObjects: ["employees", "roles", "schedules", "tasks", "messages"],
    credentialType: "none",
  },
  {
    id: "checklist_platform_migration",
    label: "Checklist platform migration",
    priorityTier: "phase_1",
    modes: ["import"],
    pilotValue: 9,
    adoptionFriction: "medium",
    roiReason:
      "Lets operators recreate opening, closing, cleaning, food-safety, and review workflows quickly.",
    firstDataObjects: [
      "checklists",
      "sops",
      "forms",
      "locations",
      "recurring_tasks",
    ],
    credentialType: "none",
  },
  {
    id: "marketman_migration",
    label: "MarketMan inventory migration",
    priorityTier: "phase_1",
    modes: ["import"],
    pilotValue: 8,
    adoptionFriction: "medium",
    roiReason:
      "Moves the highest-value inventory, supplier, recipe, count, and waste data into the cost engine.",
    firstDataObjects: [
      "items",
      "units",
      "suppliers",
      "purchases",
      "recipes",
      "counts",
      "waste",
    ],
    credentialType: "none",
  },
  {
    id: "pos_foundation",
    label: "POS integration foundation",
    priorityTier: "phase_2",
    modes: ["sync", "live_api"],
    pilotValue: 8,
    adoptionFriction: "high",
    roiReason:
      "Sales, menu item, location, and labor signals make theoretical-vs-actual cost reporting stronger.",
    firstDataObjects: ["sales", "menu_items", "locations", "labor_actuals"],
    credentialType: "oauth",
  },
  {
    id: "accounting_exports",
    label: "Accounting exports",
    priorityTier: "phase_2",
    modes: ["export", "sync"],
    pilotValue: 7,
    adoptionFriction: "medium",
    roiReason:
      "Gives owners and bookkeepers clean purchasing, expense, payment, and summary exports.",
    firstDataObjects: ["expenses", "payments", "purchases", "owner_summaries"],
    credentialType: "oauth",
  },
  {
    id: "payroll_labor_imports",
    label: "Payroll and time-clock labor imports",
    priorityTier: "phase_2",
    modes: ["import", "sync"],
    pilotValue: 7,
    adoptionFriction: "medium",
    roiReason:
      "Reconciles scheduled labor estimates against actual labor and payroll exports.",
    firstDataObjects: ["labor_entries", "employees", "pay_periods"],
    credentialType: "api_key",
  },
  {
    id: "public_api_webhooks",
    label: "Public API and webhooks",
    priorityTier: "phase_3",
    modes: ["live_api"],
    pilotValue: 6,
    adoptionFriction: "high",
    roiReason:
      "Turns FlowForce into a platform after import/export and monitored sync foundations are safe.",
    firstDataObjects: ["event_catalog", "webhook_subscriptions", "api_keys"],
    credentialType: "webhook_secret",
  },
] as const;

export const integrationModeDefinitions = {
  import:
    "One-time or repeatable customer-provided data load with mapping, preview, validation, audit, and rollback/reporting.",
  export:
    "FlowForce-owned data leaving the system as a file or provider payload with logs, retry, and reconciliation.",
  sync:
    "Scheduled or manually triggered provider exchange with checkpoints, idempotency, retries, and health status.",
  live_api:
    "Provider or customer API/webhook access with scoped credentials, rate limits, signature checks, and audit logs.",
} as const;

export const integrationCredentialRules: IntegrationCredentialRule[] = [
  {
    id: "no_browser_secret_storage",
    rule: "Raw API keys, OAuth refresh tokens, webhook signing secrets, and provider credentials must never be stored in browser-readable settings, local storage, or client-rendered metadata.",
  },
  {
    id: "server_side_custody",
    rule: "Provider credentials must be created, rotated, used, and revoked from server-side routes, edge functions, or a managed secret store with tenant scope.",
  },
  {
    id: "metadata_is_non_secret",
    rule: "Client-visible integration metadata may store provider id, status, scopes, last four characters, timestamps, health, and setup notes only.",
  },
  {
    id: "oauth_uses_state_and_pkce",
    rule: "OAuth flows must use state validation, PKCE when supported, tenant binding, and redirect allowlists.",
  },
  {
    id: "api_keys_are_scoped",
    rule: "API keys and webhook secrets must be tenant-scoped, hashed or encrypted at rest, revocable, and audited on creation/use/revocation.",
  },
] as const;

export const integrationLoggingAndRetryRules: IntegrationRetryRule[] = [
  {
    id: "imports_are_audited",
    appliesTo: ["import"],
    rule: "Every import records uploaded filename, template, row counts, validation errors, user id, company id, result status, and rollback/report references.",
  },
  {
    id: "exports_are_replayable",
    appliesTo: ["export"],
    rule: "Every export records payload hash, destination, attempt count, status, error category, and reconciliation id where available.",
  },
  {
    id: "syncs_use_checkpoints",
    appliesTo: ["sync"],
    rule: "Sync jobs use idempotency keys, provider checkpoints, exponential backoff, and clear failed/warning/success health states.",
  },
  {
    id: "live_apis_are_rate_limited",
    appliesTo: ["live_api"],
    rule: "Live API and webhook traffic records request ids, signature status, rate-limit decisions, response class, retry schedule, and tenant scope.",
  },
] as const;

export const integrationStrategyChecks = [
  "csv_imports_are_first_pilot_path",
  "workforce_checklist_and_marketman_migrations_are_phase_one",
  "pos_accounting_payroll_are_after_import_foundation",
  "imports_exports_syncs_and_live_apis_are_separated",
  "raw_credentials_are_not_client_stored",
  "integration_logs_retries_and_health_are_required",
] as const;

export function getIntegrationTargetsByTier(tier: IntegrationPriorityTier) {
  return integrationStrategyTargets.filter(
    (target) => target.priorityTier === tier,
  );
}

export function isIntegrationStrategyReady() {
  const phaseOneIds = new Set(
    getIntegrationTargetsByTier("phase_1").map((target) => target.id),
  );
  const modes = new Set(
    integrationStrategyTargets.flatMap((target) => target.modes),
  );
  const credentialRuleIds = new Set(
    integrationCredentialRules.map((rule) => rule.id),
  );
  const retryRuleIds = new Set(
    integrationLoggingAndRetryRules.map((rule) => rule.id),
  );

  return (
    phaseOneIds.has("csv_migration_framework") &&
    phaseOneIds.has("workforce_platform_migration") &&
    phaseOneIds.has("checklist_platform_migration") &&
    phaseOneIds.has("marketman_migration") &&
    modes.has("import") &&
    modes.has("export") &&
    modes.has("sync") &&
    modes.has("live_api") &&
    credentialRuleIds.has("no_browser_secret_storage") &&
    credentialRuleIds.has("server_side_custody") &&
    retryRuleIds.has("imports_are_audited") &&
    retryRuleIds.has("syncs_use_checkpoints") &&
    integrationStrategyChecks.includes(
      "integration_logs_retries_and_health_are_required",
    )
  );
}
