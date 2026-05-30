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

const service = readText(
  "src/services/integrations/posIntegrationFoundation.ts",
);
const auditEvents = readText("src/services/audit/auditEvents.ts");
const ui = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const doc = readText("docs/pos-integration-foundation.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-06-pos-integration-foundation-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "firstPOSIntegrationTarget",
    '"toast"',
    '"sales"',
    '"menu_items"',
    '"labor"',
    '"locations"',
    "posCredentialRules",
    "tenant_scoped_credentials",
    "no_browser_secret_storage",
    "server_vault_only",
    "audit_credential_lifecycle",
    "checkpointed_sync",
    "posAuditActions",
    "buildPOSIntegrationHealthSummary",
    "buildPOSCredentialMetadata",
    "isPOSIntegrationFoundationReady",
    "buildPOSIntegrationFoundationReadiness",
    "rawSecretStored: false",
  ],
  "POS integration foundation service",
);

requireIncludes(
  auditEvents,
  [
    "integrationPosCredentialPending",
    "integrationPosCredentialConnected",
    "integrationPosCredentialRevoked",
    "integrationPosHealthChecked",
    "integrationPosSyncAttempted",
    "integration.pos.credential_pending",
    "integration.pos.credential_connected",
    "integration.pos.credential_revoked",
    "integration.pos.health_checked",
    "integration.pos.sync_attempted",
  ],
  "audit event definitions",
);

requireIncludes(
  ui,
  [
    "POS sync health",
    "buildPOSIntegrationHealthSummary",
    "getPOSSyncStreamDefinitions",
    "buildPOSCredentialMetadata",
    "server-side custody",
    "posHealth.status",
  ],
  "integration settings UI",
);

if (ui.includes("apiKey: apiKey.trim()")) {
  throw new Error("Integration settings UI must not store raw POS API keys");
}

requireIncludes(
  doc,
  [
    "Toast is the first POS target.",
    "Sales: daily net sales",
    "Menu items: provider menu item id",
    "Labor actuals: clocked hours",
    "Locations: provider location id",
    "integration.pos.health_checked",
    "npm run check:pos-integration-foundation",
  ],
  "POS integration foundation doc",
);

requireIncludes(
  plan,
  [
    "- [x] Choose first POS target, likely Toast or Square.",
    "- [x] Define sales, menu item, labor, and location sync needs.",
    "- [x] Add secure credential model.",
    "- [x] Add integration health UI.",
    "09.06 POS Integration Foundation",
    "pos-integration-foundation.md",
  ],
  "Plan 09 roadmap",
);

const phaseSixBlock = plan.match(
  /### Phase 6: POS Integration Foundation[\s\S]*?(?=### Phase 7: Accounting And Payroll Integrations)/,
)?.[0];

if (!phaseSixBlock || phaseSixBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 6 still has unchecked tasks");
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
    "Toast as the first POS integration target",
    "sales, menu items, labor actuals, and locations",
    "raw secrets out of browser-readable settings",
    "Phase 09.07",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:pos-integration-foundation",
    "scripts/check-pos-integration-foundation-contract.mjs",
  ],
  "package scripts",
);

const posFoundation = await jiti.import(
  join(root, "src/services/integrations/posIntegrationFoundation.ts"),
);

if (!posFoundation.isPOSIntegrationFoundationReady()) {
  throw new Error("POS integration foundation readiness check failed");
}

if (posFoundation.firstPOSIntegrationTarget.key !== "toast") {
  throw new Error("Toast should be the first POS integration target");
}

const streamKeys = posFoundation
  .getPOSSyncStreamDefinitions()
  .map((stream) => stream.key)
  .sort();

if (streamKeys.join(",") !== "labor,locations,menu_items,sales") {
  throw new Error(
    "POS sync streams should cover sales, menu, labor, locations",
  );
}

const metadata = posFoundation.buildPOSCredentialMetadata({
  credentialMode: "server_vault_required",
  scopes: ["sales", "menu_items", "labor", "locations"],
  keyLast4: "1234",
  notes: "sample",
});

if (
  metadata.rawSecretStored !== false ||
  "apiKey" in metadata ||
  "refreshToken" in metadata ||
  "clientSecret" in metadata
) {
  throw new Error("POS credential metadata must not contain raw secrets");
}

const health = posFoundation.buildPOSIntegrationHealthSummary(
  posFoundation.samplePOSIntegrationSettings,
);

if (
  health.status !== "warning" ||
  !health.auditRequired ||
  health.provider !== "toast" ||
  health.missingStreams.join(",") !== "labor,locations"
) {
  throw new Error(
    "Sample POS health should show missing streams and audit need",
  );
}

const readiness = posFoundation.buildPOSIntegrationFoundationReadiness();

if (
  readiness.readyForLiveSync ||
  !readiness.credentialModelReady ||
  !readiness.syncNeedsDefined ||
  !readiness.healthUiReady ||
  !readiness.auditActions.includes("integration.pos.health_checked")
) {
  throw new Error("POS foundation readiness flags should match phase scope");
}

console.log("OK POS integration foundation contract");
