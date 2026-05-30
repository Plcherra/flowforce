import type { IntegrationsSettings } from "@/types/system-settings";

export type POSProviderKey = "toast";
export type POSSyncStreamKey = "sales" | "menu_items" | "labor" | "locations";
export type POSCredentialMode = "server_vault_oauth" | "server_vault_api_key";
export type POSHealthStatus =
  | "not_configured"
  | "pending"
  | "healthy"
  | "warning"
  | "error";

export type POSSyncStreamDefinition = {
  key: POSSyncStreamKey;
  label: string;
  direction: "provider_to_flowforce";
  required: boolean;
  target: string;
  syncNeed: string;
};

export type POSCredentialRule = {
  id: string;
  rule: string;
};

export type POSIntegrationProvider = {
  key: POSProviderKey;
  label: string;
  priorityReason: string;
  credentialMode: POSCredentialMode;
  syncStreams: POSSyncStreamDefinition[];
};

export type POSHealthSignal = {
  provider: POSProviderKey;
  status: POSHealthStatus;
  requiredStreams: POSSyncStreamKey[];
  configuredStreams: POSSyncStreamKey[];
  missingStreams: POSSyncStreamKey[];
  lastSuccessfulSyncAt: string | null;
  consecutiveFailures: number;
  lastErrorCode: string | null;
  auditRequired: boolean;
};

export type POSIntegrationFoundationReadiness = {
  provider: POSProviderKey;
  readyForLiveSync: boolean;
  credentialModelReady: boolean;
  syncNeedsDefined: boolean;
  healthUiReady: boolean;
  auditActions: string[];
};

export const firstPOSIntegrationTarget: POSIntegrationProvider = {
  key: "toast",
  label: "Toast",
  priorityReason:
    "Toast is the first POS target because restaurant operators commonly need sales, menu, location, and labor actuals to complete FlowForce cost and scheduling reports.",
  credentialMode: "server_vault_oauth",
  syncStreams: [
    {
      key: "sales",
      label: "Sales",
      direction: "provider_to_flowforce",
      required: true,
      target: "sales_ledger and owner financial overview",
      syncNeed:
        "Daily net sales, tender totals, discounts, taxes, service charges, and business date.",
    },
    {
      key: "menu_items",
      label: "Menu items",
      direction: "provider_to_flowforce",
      required: true,
      target: "inventory recipe/menu mapping",
      syncNeed:
        "Menu item id, name, category, price, active state, and recipe mapping hooks.",
    },
    {
      key: "labor",
      label: "Labor actuals",
      direction: "provider_to_flowforce",
      required: true,
      target: "labor_entries and schedule labor variance",
      syncNeed:
        "Clocked hours, role, employee identity, pay-period date, regular/overtime split, and source checkpoint.",
    },
    {
      key: "locations",
      label: "Locations",
      direction: "provider_to_flowforce",
      required: true,
      target: "business locations and reporting filters",
      syncNeed:
        "Provider location id, name, timezone, active state, and FlowForce location mapping.",
    },
  ],
} as const;

export const posCredentialRules: POSCredentialRule[] = [
  {
    id: "tenant_scoped_credentials",
    rule: "POS credentials must be created, rotated, revoked, and used with an explicit FlowForce company_id scope.",
  },
  {
    id: "no_browser_secret_storage",
    rule: "Raw POS API keys, OAuth refresh tokens, and provider secrets must never be stored in system_settings, local storage, or client-visible metadata.",
  },
  {
    id: "server_vault_only",
    rule: "Credential material is stored only in server-side secret custody; browser metadata may expose provider id, status, last four characters, health, scopes, and timestamps.",
  },
  {
    id: "audit_credential_lifecycle",
    rule: "Credential creation, rotation, revocation, health checks, and sync attempts are audit events with actor, company_id, provider, and request id.",
  },
  {
    id: "checkpointed_sync",
    rule: "Every POS stream uses idempotency keys, provider checkpoints, retry state, and last successful sync timestamps.",
  },
] as const;

export const posAuditActions = {
  credentialPending: "integration.pos.credential_pending",
  credentialConnected: "integration.pos.credential_connected",
  credentialRevoked: "integration.pos.credential_revoked",
  healthChecked: "integration.pos.health_checked",
  syncAttempted: "integration.pos.sync_attempted",
} as const;

export const samplePOSIntegrationSettings: IntegrationsSettings = {
  connections: [
    {
      id: "toast-sample",
      provider: "toast",
      status: "pending",
      authType: "api_key",
      lastSyncedAt: null,
      metadata: {
        credentialMode: "server_vault_required",
        syncStreams: ["sales", "menu_items"],
        consecutiveFailures: 1,
        lastErrorCode: "credential_pending",
      },
    },
  ],
  providers: {
    toast: {
      status: "pending",
      authType: "api_key",
    },
  },
  syncMappings: {},
};

export function getPOSSyncStreamDefinitions() {
  return firstPOSIntegrationTarget.syncStreams;
}

export function buildPOSIntegrationHealthSummary(
  integrations: IntegrationsSettings,
  provider: POSProviderKey = firstPOSIntegrationTarget.key,
): POSHealthSignal {
  const connection = integrations.connections.find(
    (item) => item.provider === provider,
  );
  const configuredStreams = readConfiguredStreams(connection?.metadata);
  const requiredStreams = firstPOSIntegrationTarget.syncStreams
    .filter((stream) => stream.required)
    .map((stream) => stream.key);
  const missingStreams = requiredStreams.filter(
    (stream) => !configuredStreams.includes(stream),
  );
  const consecutiveFailures = readNumber(
    connection?.metadata?.consecutiveFailures,
  );
  const lastErrorCode = readString(connection?.metadata?.lastErrorCode);

  return {
    provider,
    status: resolvePOSHealthStatus({
      connectionStatus: connection?.status,
      missingStreams,
      consecutiveFailures,
      lastErrorCode,
    }),
    requiredStreams,
    configuredStreams,
    missingStreams,
    lastSuccessfulSyncAt: connection?.lastSyncedAt ?? null,
    consecutiveFailures,
    lastErrorCode,
    auditRequired: true,
  };
}

export function buildPOSCredentialMetadata(params: {
  credentialMode: "server_vault_required" | "server_vault_configured";
  scopes: POSSyncStreamKey[];
  keyLast4?: string;
  notes?: string;
}) {
  return {
    credentialMode: params.credentialMode,
    scopes: params.scopes,
    keyLast4: params.keyLast4 ?? null,
    notes: params.notes ?? "",
    rawSecretStored: false,
  };
}

export function isPOSIntegrationFoundationReady() {
  const streamKeys = new Set(
    firstPOSIntegrationTarget.syncStreams.map((stream) => stream.key),
  );
  const credentialRuleIds = new Set(posCredentialRules.map((rule) => rule.id));
  const auditActions = new Set(Object.values(posAuditActions));
  const sampleHealth = buildPOSIntegrationHealthSummary(
    samplePOSIntegrationSettings,
  );
  const credentialMetadata = buildPOSCredentialMetadata({
    credentialMode: "server_vault_required",
    scopes: ["sales", "menu_items", "labor", "locations"],
    keyLast4: "1234",
  });

  return (
    firstPOSIntegrationTarget.key === "toast" &&
    streamKeys.has("sales") &&
    streamKeys.has("menu_items") &&
    streamKeys.has("labor") &&
    streamKeys.has("locations") &&
    credentialRuleIds.has("tenant_scoped_credentials") &&
    credentialRuleIds.has("no_browser_secret_storage") &&
    credentialRuleIds.has("audit_credential_lifecycle") &&
    auditActions.has("integration.pos.health_checked") &&
    sampleHealth.status === "warning" &&
    sampleHealth.auditRequired &&
    credentialMetadata.rawSecretStored === false
  );
}

export function buildPOSIntegrationFoundationReadiness(): POSIntegrationFoundationReadiness {
  return {
    provider: firstPOSIntegrationTarget.key,
    readyForLiveSync: false,
    credentialModelReady: posCredentialRules.length >= 5,
    syncNeedsDefined: firstPOSIntegrationTarget.syncStreams.length === 4,
    healthUiReady: true,
    auditActions: Object.values(posAuditActions),
  };
}

function resolvePOSHealthStatus(params: {
  connectionStatus?: string;
  missingStreams: POSSyncStreamKey[];
  consecutiveFailures: number;
  lastErrorCode: string | null;
}): POSHealthStatus {
  if (!params.connectionStatus || params.connectionStatus === "disconnected") {
    return "not_configured";
  }

  if (params.connectionStatus === "error" || params.consecutiveFailures >= 3) {
    return "error";
  }

  if (
    params.connectionStatus === "pending" ||
    params.missingStreams.length > 0 ||
    params.consecutiveFailures > 0 ||
    params.lastErrorCode
  ) {
    return "warning";
  }

  return "healthy";
}

function readConfiguredStreams(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.syncStreams ?? metadata?.scopes;
  if (!Array.isArray(value)) {
    return [] as POSSyncStreamKey[];
  }

  const validStreams = new Set(
    firstPOSIntegrationTarget.syncStreams.map((stream) => stream.key),
  );
  return value
    .map((item) => String(item))
    .filter((item): item is POSSyncStreamKey =>
      validStreams.has(item as POSSyncStreamKey),
    );
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
