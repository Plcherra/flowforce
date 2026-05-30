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

const requireExcludes = (text, needles, label) => {
  const present = needles.filter((needle) => text.includes(needle));
  if (present.length) {
    throw new Error(`${label} contains forbidden terms: ${present.join(", ")}`);
  }
};

const doc = readText("docs/integration-strategy.md");
const report = readText(
  "docs/roadmap/reports/09-01-integration-strategy-2026-05-30.md",
);
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/integrations/integrationStrategy.ts");
const settingsPanel = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Integration Strategy",
    "CSV migration framework",
    "Workforce platform migration path",
    "Checklist platform migration path",
    "MarketMan inventory migration",
    "Imports:",
    "Exports:",
    "Syncs:",
    "Live APIs:",
    "Raw API keys, OAuth refresh tokens, webhook signing secrets, and provider credentials must not be stored in browser-readable settings",
    "Sync jobs use idempotency keys, provider checkpoints, exponential backoff",
    "npm run check:integration-strategy",
  ],
  "integration strategy doc",
);

requireIncludes(
  service,
  [
    "integrationStrategyTargets",
    "csv_migration_framework",
    "workforce_platform_migration",
    "checklist_platform_migration",
    "marketman_migration",
    "pos_foundation",
    "accounting_exports",
    "payroll_labor_imports",
    "public_api_webhooks",
    "integrationModeDefinitions",
    "integrationCredentialRules",
    "no_browser_secret_storage",
    "integrationLoggingAndRetryRules",
    "isIntegrationStrategyReady",
  ],
  "integration strategy service",
);

requireIncludes(
  settingsPanel,
  [
    'status: "pending"',
    'credentialMode: "server_vault_required"',
    "keyLast4",
    "Raw API keys are never stored in browser-readable settings.",
  ],
  "integration settings placeholder safety",
);

requireExcludes(
  settingsPanel,
  ["apiKey: apiKey.trim()"],
  "integration settings placeholder safety",
);

requireIncludes(
  plan,
  [
    "- [x] Rank integrations by pilot value.",
    "- [x] Separate imports, exports, syncs, and live APIs.",
    "- [x] Define OAuth/API-key storage rules.",
    "- [x] Define integration logging and retry needs.",
    "09.01 Integration Strategy",
    "integration-strategy.md",
  ],
  "Plan 09 roadmap",
);

const phaseOneBlock = plan.match(
  /### Phase 1: Integration Strategy[\s\S]*?(?=### Phase 2: CSV Import Framework)/,
)?.[0];

if (!phaseOneBlock || phaseOneBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 1 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "Last phase report: [09.04 Checklist Platform Migration Path]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "migration friction first",
    "Ranked CSV migration, workforce migration, checklist migration, and MarketMan migration as phase-one work.",
    "forbid raw secrets in browser-readable settings",
    "Updated the integrations settings placeholder",
    "Phase 09.02 should implement the generic CSV import framework",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:integration-strategy",
    "scripts/check-integration-strategy-contract.mjs",
  ],
  "package scripts",
);

const strategy = await jiti.import(
  join(root, "src/services/integrations/integrationStrategy.ts"),
);

if (!strategy.isIntegrationStrategyReady()) {
  throw new Error("Integration strategy contract is not ready");
}

const phaseOneTargets = strategy.getIntegrationTargetsByTier("phase_1");
if (phaseOneTargets.length < 4) {
  throw new Error("Expected at least four phase-one integration targets");
}

process.stdout.write("OK integration strategy contract\n");
