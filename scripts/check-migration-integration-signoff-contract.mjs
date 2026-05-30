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
  "src/services/integrations/migrationIntegrationSignoff.ts",
);
const ui = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const doc = readText("docs/migration-and-integration-signoff.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-10-migration-integration-signoff-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "MigrationPlaybookStageKey",
    "SampleDataPackKey",
    "DemoMigrationStepKey",
    "customerMigrationPlaybook",
    "sampleDataPacks",
    "demoMigrationFlow",
    "buildTestTenantPopulationPlan",
    "buildMigrationIntegrationSignoffReadiness",
    "isMigrationIntegrationSignoffReady",
    "restaurant_starter",
    "retail_starter",
    "operations_workflow_demo",
    "owner_signoff",
  ],
  "migration integration signoff service",
);

requireIncludes(
  ui,
  [
    "Migration and integration signoff",
    "buildMigrationIntegrationSignoffReadiness",
    "buildTestTenantPopulationPlan",
    "getCustomerMigrationPlaybook",
    "getSampleDataPacks",
    "getDemoMigrationFlow",
    "Plan 09 signoff",
    "Test tenant",
  ],
  "integration settings UI",
);

requireIncludes(
  doc,
  [
    "Switching to FlowForce should feel practical, not scary.",
    "Scope source systems.",
    "Restaurant starter",
    "Retail starter",
    "Operations workflow demo",
    "Create test tenant.",
    "Owner signoff.",
    "A test tenant can be populated",
    "npm run check:migration-integration-signoff",
  ],
  "migration integration signoff doc",
);

requireIncludes(
  plan,
  [
    "- [x] Create customer migration playbook.",
    "- [x] Create sample data packs.",
    "- [x] Add demo migration flow.",
    "- [x] Update roadmap status.",
    "09.10 Migration And Integration Signoff",
    "migration-and-integration-signoff.md",
  ],
  "Plan 09 roadmap",
);

const phaseTenBlock = plan.match(
  /### Phase 10: Migration And Integration Signoff[\s\S]*$/u,
)?.[0];

if (!phaseTenBlock || phaseTenBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 10 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
    "- [x] 9.  Integrations and migration tools",
    "- [ ] 10. Production infrastructure and launch",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "seven-stage customer migration playbook",
    "restaurant, retail, and operations workflow demo tenants",
    "test-tenant population plan",
    "Plan 10 should focus on production infrastructure and launch",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:migration-integration-signoff",
    "scripts/check-migration-integration-signoff-contract.mjs",
  ],
  "package scripts",
);

const signoff = await jiti.import(
  join(root, "src/services/integrations/migrationIntegrationSignoff.ts"),
);

if (!signoff.isMigrationIntegrationSignoffReady()) {
  throw new Error("Migration integration signoff readiness check failed");
}

const playbook = signoff.getCustomerMigrationPlaybook();
const samplePacks = signoff.getSampleDataPacks();
const demoFlow = signoff.getDemoMigrationFlow();
const populationPlan = signoff.buildTestTenantPopulationPlan();
const readiness = signoff.buildMigrationIntegrationSignoffReadiness();

if (
  playbook.length !== 7 ||
  playbook[0].key !== "scope" ||
  playbook.at(-1)?.key !== "handoff"
) {
  throw new Error(
    "Customer migration playbook should cover scope through handoff",
  );
}

if (
  samplePacks.length !== 3 ||
  !samplePacks.some((pack) => pack.key === "restaurant_starter") ||
  !samplePacks.some((pack) => pack.key === "retail_starter") ||
  !samplePacks.some((pack) => pack.key === "operations_workflow_demo")
) {
  throw new Error(
    "Sample data packs should cover restaurant, retail, and workflow demos",
  );
}

if (
  demoFlow.length !== 7 ||
  !demoFlow.some((step) => step.key === "create_test_tenant") ||
  !demoFlow.some((step) => step.key === "owner_signoff") ||
  demoFlow.filter((step) => step.blocksLaunch).length < 5
) {
  throw new Error(
    "Demo migration flow should cover test tenant creation through owner signoff",
  );
}

if (
  populationPlan.packs.length !== 3 ||
  populationPlan.expectedRecords.employees < 20 ||
  populationPlan.expectedRecords.inventoryItems < 100 ||
  !populationPlan.signoffChecks.includes("integration_monitoring_visible") ||
  !populationPlan.signoffChecks.includes("customer_acceptance_recorded")
) {
  throw new Error(
    "Test tenant population plan should create sample records and signoff checks",
  );
}

if (
  !readiness.customerMigrationPlaybookReady ||
  !readiness.sampleDataPacksReady ||
  !readiness.demoMigrationFlowReady ||
  !readiness.roadmapStatusReady ||
  !readiness.testTenantCanBePopulated ||
  readiness.readyForLiveCustomerCutover
) {
  throw new Error(
    "Migration integration signoff readiness flags should match phase scope",
  );
}

console.log("OK migration integration signoff contract");
