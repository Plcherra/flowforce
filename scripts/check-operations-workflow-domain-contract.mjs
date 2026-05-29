import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

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

const contract = JSON.parse(
  readText("src/services/operations/operationsWorkflowContract.json"),
);
const doc = readText("docs/operations-workflow-domain-model.md");
const migration = readText(
  "supabase/migrations/20260528001200_phase6_workflow_domain_model.sql",
);
const roadmap = readText("docs/roadmap/06-operations-workflows-and-compliance.md");
const report = readText(
  "docs/roadmap/reports/06-01-workflow-domain-model-2026-05-28.md",
);
const dbTest = readText("supabase/tests/phase6_workflow_domain_model.test.sql");
const packageJson = readText("package.json");

for (const key of [
  "sourceOfTruth",
  "domainObjects",
  "reuseMap",
  "plannedArtifacts",
  "tenantRules",
  "permissionRules",
  "auditEvents",
]) {
  if (!(key in contract)) {
    throw new Error(`operations workflow contract missing top-level key: ${key}`);
  }
}

if (!Array.isArray(contract.domainObjects) || contract.domainObjects.length < 8) {
  throw new Error("operations workflow contract must define at least eight domain objects");
}

for (const object of contract.domainObjects) {
  requireIncludes(doc, [object.table], `domain object ${object.key}`);
  requireIncludes(migration, [object.table], `migration for ${object.key}`);
}

for (const artifact of [
  ...contract.plannedArtifacts.tables,
  ...contract.plannedArtifacts.extendedTables,
  ...contract.plannedArtifacts.views,
]) {
  requireIncludes(doc, [artifact], `doc artifact ${artifact}`);
  requireIncludes(migration, [artifact], `migration artifact ${artifact}`);
}

requireIncludes(
  migration,
  [
    "alter table public.workflows add column if not exists company_id",
    "create table if not exists public.workflow_assignments",
    "create table if not exists public.workflow_evidence",
    "create table if not exists public.workflow_reviews",
    "create table if not exists public.workflow_exceptions",
    "create policy \"Company members can manage workflows\"",
    "create policy \"Company members can manage workflow evidence\"",
    "create or replace view public.workflow_domain_model_v",
    "current_user_company_ids()",
    "set_workflow_child_company_id",
  ],
  "workflow domain migration",
);

requireIncludes(
  doc,
  [
    "Forms stay as the field/input schema system.",
    "Tasks stay as follow-up work.",
    "`ops_issues` stays as the operational issue stream.",
    "`audit_log` stays as the immutable audit destination.",
    "Every workflow-owned row carries `company_id`.",
  ],
  "workflow domain doc",
);

requireIncludes(
  roadmap,
  [
    "Define workflow, checklist, step, assignment, run, evidence, review, and exception models.",
    "Map existing forms/tasks to workflow concepts.",
    "Decide what is reused versus newly modeled.",
    "Define permissions and audit needs.",
    "06.01 Workflow Domain Model",
    "docs/operations-workflow-domain-model.md",
  ],
  "Plan 06 roadmap",
);

const phaseOneBlock = roadmap.match(
  /### Phase 1: Workflow Domain Model[\s\S]*?### Phase 2:/,
)?.[0];

if (!phaseOneBlock || phaseOneBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 1 still has unchecked tasks");
}

requireIncludes(
  report,
  [
    "phase6_workflow_domain_model.test.sql",
    "workflow_assignments",
    "workflow_evidence",
    "workflow_reviews",
    "workflow_exceptions",
    "Phase 06.02",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  dbTest,
  [
    "workflow_domain_model_v",
    "Tenant A reads only own workflows",
    "Tenant A cannot assign a Tenant B workflow",
    "workflow_evidence",
    "workflow_reviews",
    "workflow_exceptions",
  ],
  "workflow domain DB test",
);

requireIncludes(
  packageJson,
  [
    "check:operations-workflow-domain",
    "scripts/check-operations-workflow-domain-contract.mjs",
    "supabase/tests/phase6_workflow_domain_model.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK operations workflow domain contract\n");
