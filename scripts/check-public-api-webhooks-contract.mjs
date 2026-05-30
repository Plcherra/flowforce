import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const service = readText("src/services/integrations/publicApiWebhooks.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const ui = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const doc = readText("docs/public-api-webhooks.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-08-public-api-webhooks-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "PublicApiScope",
    "WebhookEventKey",
    "PublicApiKeyDefinition",
    "WebhookSubscriptionDefinition",
    "publicApiKeyModel",
    "publicApiEventCatalog",
    "webhookSubscriptionDefaults",
    "publicApiRateLimits",
    "publicApiAuditActions",
    "samplePublicApiKey",
    "sampleWebhookSubscription",
    "buildPublicApiKeyRecord",
    "buildWebhookSubscription",
    "buildWebhookDeliveryLog",
    "calculateWebhookNextRetryAt",
    "buildPublicApiWebhookReadiness",
    "isPublicApiWebhooksReady",
    "hashed_secret",
    "shown_once",
    "tenant_scoped",
  ],
  "public API webhooks service",
);

requireIncludes(
  auditEvents,
  [
    "integrationPublicApiKeyCreated",
    "integrationPublicApiKeyUsed",
    "integrationPublicApiKeyRevoked",
    "integrationWebhookSubscriptionCreated",
    "integrationWebhookDeliveryAttempted",
    "integrationWebhookDeliveryFailed",
    "integrationPublicApiRateLimitExceeded",
    "integration.public_api_key.created",
    "integration.public_api_key.used",
    "integration.public_api_key.revoked",
    "integration.webhook_subscription.created",
    "integration.webhook_delivery.attempted",
    "integration.webhook_delivery.failed",
    "integration.public_api.rate_limit_exceeded",
  ],
  "audit event definitions",
);

requireIncludes(
  ui,
  [
    "Public API and webhooks",
    "buildPublicApiWebhookReadiness",
    "getPublicApiEventCatalog",
    "getPublicApiRateLimits",
    "API key model",
    "Webhook events",
    "Rate limits",
    "Audit logs",
  ],
  "integration settings UI",
);

requireIncludes(
  doc,
  [
    "Public API keys are tenant-scoped and shown once.",
    "Hashed secret",
    "x-flowforce-signature",
    "employee.created",
    "schedule.published",
    "inventory.count.completed",
    "purchase_order.approved",
    "workflow.instance.completed",
    "incident.created",
    "integration.public_api_key.created",
    "npm run check:public-api-webhooks",
  ],
  "public API webhooks doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define API key model.",
    "- [x] Add webhook subscriptions.",
    "- [x] Add event catalog.",
    "- [x] Add rate limits and audit logs.",
    "09.08 Webhooks And Public API",
    "public-api-webhooks.md",
  ],
  "Plan 09 roadmap",
);

const phaseEightBlock = plan.match(
  /### Phase 8: Webhooks And Public API[\s\S]*?(?=### Phase 9: Integration Monitoring)/,
)?.[0];

if (!phaseEightBlock || phaseEightBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 8 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "tenant-scoped public API key model",
    "webhook subscription model",
    "employee, schedule, inventory count, purchase order, workflow, and incident events",
    "Phase 09.09",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:public-api-webhooks",
    "scripts/check-public-api-webhooks-contract.mjs",
  ],
  "package scripts",
);

const publicApi = await jiti.import(
  join(root, "src/services/integrations/publicApiWebhooks.ts"),
);

if (!publicApi.isPublicApiWebhooksReady()) {
  throw new Error("Public API/webhooks readiness check failed");
}

const eventKeys = publicApi
  .getPublicApiEventCatalog()
  .map((event) => event.key)
  .sort();

for (const requiredEvent of [
  "employee.created",
  "employee.updated",
  "schedule.published",
  "inventory.count.completed",
  "purchase_order.approved",
  "workflow.instance.completed",
  "incident.created",
]) {
  if (!eventKeys.includes(requiredEvent)) {
    throw new Error(`Webhook event catalog missing ${requiredEvent}`);
  }
}

const apiKey = publicApi.buildPublicApiKeyRecord({
  companyId: "sample-company",
  name: "reporting",
  scopes: ["read:employees", "read:schedules"],
  hashedSecret: "sha256:sample",
  createdBy: "sample-admin",
});

if (
  apiKey.companyId !== "sample-company" ||
  apiKey.status !== "active" ||
  !apiKey.keyPrefix.startsWith("ff_live_") ||
  !apiKey.hashedSecret.startsWith("sha256:") ||
  "rawSecret" in apiKey
) {
  throw new Error("Public API key model should be tenant-scoped and hashed");
}

const subscription = publicApi.buildWebhookSubscription({
  companyId: "sample-company",
  endpointUrl: "https://example.com/flowforce/webhooks",
  eventKeys: ["employee.created", "schedule.published"],
  signingSecretRef: "vault://sample-company/webhooks/reporting",
});

if (
  subscription.status !== "active" ||
  !subscription.signingSecretRef.startsWith("vault://") ||
  subscription.eventKeys.length !== 2
) {
  throw new Error(
    "Webhook subscription should use server-side signing custody",
  );
}

const deliveryLog = publicApi.buildWebhookDeliveryLog({
  companyId: "sample-company",
  subscriptionId: subscription.id,
  eventKey: "schedule.published",
  attemptCount: 2,
  payloadHash: "sha256:payload",
  responseStatus: 503,
  status: "retry_scheduled",
});

if (
  deliveryLog.signatureVersion !== "v1" ||
  !deliveryLog.requestId.startsWith("req_") ||
  !deliveryLog.nextRetryAt ||
  deliveryLog.responseStatus !== 503
) {
  throw new Error(
    "Webhook delivery logs should include signature, request, retry, and response state",
  );
}

const rateLimits = publicApi.getPublicApiRateLimits();

if (
  rateLimits.length !== 2 ||
  !rateLimits.some((limit) => limit.appliesTo === "api_key") ||
  !rateLimits.some((limit) => limit.appliesTo === "webhook_delivery")
) {
  throw new Error("Public API and webhook rate limits are incomplete");
}

const readiness = publicApi.buildPublicApiWebhookReadiness();

if (
  !readiness.apiKeyModelReady ||
  !readiness.webhookSubscriptionsReady ||
  !readiness.eventCatalogReady ||
  !readiness.rateLimitsReady ||
  !readiness.auditActionsReady ||
  readiness.readyForExternalDevelopers
) {
  throw new Error(
    "Public API/webhook readiness flags should match phase scope",
  );
}

console.log("OK public API webhooks contract");
