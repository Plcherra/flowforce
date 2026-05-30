export type PublicApiScope =
  | "read:employees"
  | "read:schedules"
  | "read:inventory"
  | "read:purchasing"
  | "read:workflows"
  | "write:webhook_events";

export type WebhookEventKey =
  | "employee.created"
  | "employee.updated"
  | "schedule.published"
  | "inventory.count.completed"
  | "purchase_order.approved"
  | "workflow.instance.completed"
  | "incident.created";

export type PublicApiKeyStatus = "active" | "revoked" | "expired";
export type WebhookSubscriptionStatus = "active" | "paused" | "failing";

export type PublicApiKeyDefinition = {
  id: string;
  companyId: string;
  name: string;
  keyPrefix: string;
  hashedSecret: string;
  scopes: PublicApiScope[];
  status: PublicApiKeyStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

export type WebhookSubscriptionDefinition = {
  id: string;
  companyId: string;
  endpointUrl: string;
  signingSecretRef: string;
  eventKeys: WebhookEventKey[];
  status: WebhookSubscriptionStatus;
  maxAttempts: number;
  timeoutSeconds: number;
};

export type WebhookEventDefinition = {
  key: WebhookEventKey;
  label: string;
  payloadSchemaVersion: string;
  sourceTables: string[];
  retryable: boolean;
};

export type PublicApiRateLimitRule = {
  id: string;
  appliesTo: "api_key" | "webhook_delivery";
  windowSeconds: number;
  maxRequests: number;
  burstRequests: number;
  blockBehavior: "reject_429" | "pause_subscription";
};

export type WebhookDeliveryLog = {
  id: string;
  companyId: string;
  subscriptionId: string;
  eventKey: WebhookEventKey;
  status: "queued" | "delivered" | "retry_scheduled" | "failed";
  attemptCount: number;
  requestId: string;
  payloadHash: string;
  signatureVersion: "v1";
  nextRetryAt: string | null;
  responseStatus: number | null;
};

export const publicApiKeyModel = {
  storage:
    "Public API keys are shown once, then stored only as hashed secrets with tenant scope.",
  prefix: "ff_live_",
  rotationDays: 90,
  allowedScopes: [
    "read:employees",
    "read:schedules",
    "read:inventory",
    "read:purchasing",
    "read:workflows",
    "write:webhook_events",
  ] satisfies PublicApiScope[],
  requiredControls: [
    "tenant_scoped",
    "hashed_secret",
    "shown_once",
    "revocable",
    "expires_at_required",
    "audit_on_create_use_revoke",
  ],
} as const;

export const publicApiEventCatalog: WebhookEventDefinition[] = [
  {
    key: "employee.created",
    label: "Employee created",
    payloadSchemaVersion: "employee-event-v1",
    sourceTables: ["employees", "company_members"],
    retryable: true,
  },
  {
    key: "employee.updated",
    label: "Employee updated",
    payloadSchemaVersion: "employee-event-v1",
    sourceTables: ["employees", "company_members"],
    retryable: true,
  },
  {
    key: "schedule.published",
    label: "Schedule published",
    payloadSchemaVersion: "schedule-event-v1",
    sourceTables: ["work_schedules", "shift_assignments"],
    retryable: true,
  },
  {
    key: "inventory.count.completed",
    label: "Inventory count completed",
    payloadSchemaVersion: "inventory-count-event-v1",
    sourceTables: ["inv_counts", "inv_count_lines"],
    retryable: true,
  },
  {
    key: "purchase_order.approved",
    label: "Purchase order approved",
    payloadSchemaVersion: "purchase-order-event-v1",
    sourceTables: ["purchase_orders", "purchase_order_items"],
    retryable: true,
  },
  {
    key: "workflow.instance.completed",
    label: "Workflow instance completed",
    payloadSchemaVersion: "workflow-event-v1",
    sourceTables: ["task_workflow_instances", "workflow_step_instances"],
    retryable: true,
  },
  {
    key: "incident.created",
    label: "Incident created",
    payloadSchemaVersion: "incident-event-v1",
    sourceTables: ["workflow_exceptions", "task_activities"],
    retryable: true,
  },
] as const;

export const webhookSubscriptionDefaults = {
  signingSecretStorage: "server_vault_only",
  signatureHeader: "x-flowforce-signature",
  timestampHeader: "x-flowforce-timestamp",
  maxAttempts: 5,
  timeoutSeconds: 10,
  retryBackoffMinutes: [1, 5, 30, 120, 720],
} as const;

export const publicApiRateLimits: PublicApiRateLimitRule[] = [
  {
    id: "tenant_public_api_default",
    appliesTo: "api_key",
    windowSeconds: 60,
    maxRequests: 600,
    burstRequests: 100,
    blockBehavior: "reject_429",
  },
  {
    id: "webhook_delivery_default",
    appliesTo: "webhook_delivery",
    windowSeconds: 60,
    maxRequests: 1200,
    burstRequests: 200,
    blockBehavior: "pause_subscription",
  },
] as const;

export const publicApiAuditActions = {
  apiKeyCreated: "integration.public_api_key.created",
  apiKeyUsed: "integration.public_api_key.used",
  apiKeyRevoked: "integration.public_api_key.revoked",
  webhookSubscriptionCreated: "integration.webhook_subscription.created",
  webhookDeliveryAttempted: "integration.webhook_delivery.attempted",
  webhookDeliveryFailed: "integration.webhook_delivery.failed",
  rateLimitExceeded: "integration.public_api.rate_limit_exceeded",
} as const;

export const samplePublicApiKey: PublicApiKeyDefinition = {
  id: "api-key-sample",
  companyId: "sample-company",
  name: "Sample reporting key",
  keyPrefix: "ff_live_sample",
  hashedSecret: "sha256:sample-public-api-secret-hash",
  scopes: ["read:employees", "read:schedules", "read:inventory"],
  status: "active",
  createdBy: "sample-admin",
  createdAt: "2026-05-30T12:00:00.000Z",
  expiresAt: "2026-08-28T12:00:00.000Z",
  lastUsedAt: null,
};

export const sampleWebhookSubscription: WebhookSubscriptionDefinition = {
  id: "webhook-subscription-sample",
  companyId: "sample-company",
  endpointUrl: "https://example.com/flowforce/webhooks",
  signingSecretRef: "vault://sample-company/webhooks/sample",
  eventKeys: ["schedule.published", "inventory.count.completed"],
  status: "active",
  maxAttempts: webhookSubscriptionDefaults.maxAttempts,
  timeoutSeconds: webhookSubscriptionDefaults.timeoutSeconds,
};

export function getPublicApiEventCatalog() {
  return publicApiEventCatalog;
}

export function getPublicApiRateLimits() {
  return publicApiRateLimits;
}

export function getWebhookSubscriptionDefaults() {
  return webhookSubscriptionDefaults;
}

export function buildPublicApiKeyRecord(params: {
  companyId: string;
  name: string;
  scopes: PublicApiScope[];
  hashedSecret: string;
  createdBy: string;
  now?: string;
}): PublicApiKeyDefinition {
  const createdAt = params.now ?? "2026-05-30T12:00:00.000Z";
  const expiresAt = new Date(
    new Date(createdAt).getTime() + publicApiKeyModel.rotationDays * 86_400_000,
  ).toISOString();

  return {
    id: [params.companyId, "public-api", params.name].join(":"),
    companyId: params.companyId,
    name: params.name,
    keyPrefix: `${publicApiKeyModel.prefix}${params.companyId.slice(0, 6)}`,
    hashedSecret: params.hashedSecret,
    scopes: params.scopes,
    status: "active",
    createdBy: params.createdBy,
    createdAt,
    expiresAt,
    lastUsedAt: null,
  };
}

export function buildWebhookSubscription(params: {
  companyId: string;
  endpointUrl: string;
  eventKeys: WebhookEventKey[];
  signingSecretRef: string;
}): WebhookSubscriptionDefinition {
  return {
    id: [params.companyId, "webhook", params.endpointUrl].join(":"),
    companyId: params.companyId,
    endpointUrl: params.endpointUrl,
    signingSecretRef: params.signingSecretRef,
    eventKeys: params.eventKeys,
    status: "active",
    maxAttempts: webhookSubscriptionDefaults.maxAttempts,
    timeoutSeconds: webhookSubscriptionDefaults.timeoutSeconds,
  };
}

export function buildWebhookDeliveryLog(params: {
  companyId: string;
  subscriptionId: string;
  eventKey: WebhookEventKey;
  attemptCount: number;
  payloadHash: string;
  responseStatus?: number | null;
  status: WebhookDeliveryLog["status"];
}): WebhookDeliveryLog {
  return {
    id: [
      params.companyId,
      params.subscriptionId,
      params.eventKey,
      params.attemptCount,
    ].join(":"),
    companyId: params.companyId,
    subscriptionId: params.subscriptionId,
    eventKey: params.eventKey,
    status: params.status,
    attemptCount: params.attemptCount,
    requestId: cryptoSafeRequestId(params),
    payloadHash: params.payloadHash,
    signatureVersion: "v1",
    nextRetryAt: calculateWebhookNextRetryAt(
      params.status,
      params.attemptCount,
    ),
    responseStatus: params.responseStatus ?? null,
  };
}

export function calculateWebhookNextRetryAt(
  status: WebhookDeliveryLog["status"],
  attemptCount: number,
  now = new Date("2026-05-30T12:00:00.000Z"),
) {
  if (status !== "failed" && status !== "retry_scheduled") {
    return null;
  }

  const delayMinutes =
    webhookSubscriptionDefaults.retryBackoffMinutes[
      Math.min(Math.max(attemptCount - 1, 0), 4)
    ];
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

export function buildPublicApiWebhookReadiness() {
  return {
    apiKeyModelReady:
      publicApiKeyModel.requiredControls.includes("hashed_secret") &&
      publicApiKeyModel.requiredControls.includes("tenant_scoped") &&
      publicApiKeyModel.allowedScopes.length >= 6,
    webhookSubscriptionsReady:
      sampleWebhookSubscription.signingSecretRef.startsWith("vault://") &&
      webhookSubscriptionDefaults.signatureHeader === "x-flowforce-signature",
    eventCatalogReady: publicApiEventCatalog.length >= 7,
    rateLimitsReady: publicApiRateLimits.length === 2,
    auditActionsReady: Object.keys(publicApiAuditActions).length === 7,
    readyForExternalDevelopers: false,
  };
}

export function isPublicApiWebhooksReady() {
  const readiness = buildPublicApiWebhookReadiness();
  const key = buildPublicApiKeyRecord({
    companyId: "sample-company",
    name: "sample",
    scopes: ["read:employees", "read:schedules"],
    hashedSecret: "sha256:sample",
    createdBy: "sample-admin",
  });
  const subscription = buildWebhookSubscription({
    companyId: "sample-company",
    endpointUrl: "https://example.com/flowforce/webhooks",
    eventKeys: ["employee.created", "schedule.published"],
    signingSecretRef: "vault://sample-company/webhooks/sample",
  });
  const deliveryLog = buildWebhookDeliveryLog({
    companyId: "sample-company",
    subscriptionId: subscription.id,
    eventKey: "schedule.published",
    attemptCount: 2,
    payloadHash: "sha256:payload",
    status: "retry_scheduled",
    responseStatus: 503,
  });

  return (
    readiness.apiKeyModelReady &&
    readiness.webhookSubscriptionsReady &&
    readiness.eventCatalogReady &&
    readiness.rateLimitsReady &&
    readiness.auditActionsReady &&
    !readiness.readyForExternalDevelopers &&
    key.hashedSecret.startsWith("sha256:") &&
    !("rawSecret" in key) &&
    subscription.eventKeys.length === 2 &&
    Boolean(deliveryLog.nextRetryAt)
  );
}

function cryptoSafeRequestId(params: {
  companyId: string;
  subscriptionId: string;
  eventKey: WebhookEventKey;
  attemptCount: number;
}) {
  return [
    "req",
    params.companyId,
    params.subscriptionId.length,
    params.eventKey.replace(/\W/g, "_"),
    params.attemptCount,
  ].join("_");
}
