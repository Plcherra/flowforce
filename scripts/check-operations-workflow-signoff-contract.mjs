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

const signoff = readText("docs/operations-workflow-signoff.md");
const roadmap = readText("docs/roadmap/06-operations-workflows-and-compliance.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const demo = readText("docs/roadmap/01-product-positioning-and-scope.md");
const demoReport = readText(
  "docs/roadmap/reports/01-08-sales-narrative-and-demo-script-2026-05-27.md",
);
const report = readText(
  "docs/roadmap/reports/06-10-operations-workflow-signoff-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260528002100_phase6_operations_workflow_signoff.sql",
);
const service = readText("src/services/operations/operationsWorkflowSignoff.ts");
const dbTest = readText("supabase/tests/phase6_operations_workflow_signoff.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "install_operations_workflow_demo",
    "operations_workflow_demo_readiness_v",
    "opening_checklist",
    "closing_checklist",
    "cleaning_routine",
    "food_safety_check",
    "operations_workflow_signoff",
    "record_source",
    "sample",
    "ready_for_demo",
  ],
  "operations workflow signoff migration",
);

requireIncludes(
  service,
  [
    "OperationsWorkflowDemoReadinessRow",
    "operationsWorkflowDemoTemplates",
    "operationsWorkflowSignoffChecks",
    "isOperationsWorkflowDemoReady",
    "/app/operations",
  ],
  "operations workflow signoff service",
);

requireIncludes(
  signoff,
  [
    "operations workflow system",
    "install_operations_workflow_demo(company_id)",
    "operations_workflow_demo_readiness_v",
    "opening, closing, cleaning, and food-safety workflows",
    "same route is used for desktop and mobile web",
    "npm run check:operations-workflow-signoff",
  ],
  "operations workflow signoff doc",
);

requireIncludes(
  dbTest,
  [
    "tenant member can install the operations workflow demo",
    "readiness view counts the four signed-off demo workflows",
    "demo failed step creates automation follow-up",
    "operations workflow demo installer is idempotent",
    "Tenant B cannot install Tenant A operations workflow demo",
  ],
  "operations workflow signoff DB test",
);

requireIncludes(
  roadmap,
  [
    "Seed demo workflows.",
    "Add smoke coverage.",
    "Update sales/demo script.",
    "Update roadmap status.",
    "06.10 Operations Workflow Signoff",
    "docs/operations-workflow-signoff.md",
  ],
  "Plan 06 roadmap",
);

const phaseTenBlock = roadmap.match(
  /### Phase 10: Operations Workflow Signoff[\s\S]*$/,
)?.[0];

if (!phaseTenBlock || phaseTenBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 10 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "[x] 6.  Operations workflows and compliance",
  ],
  "master roadmap",
);

requireIncludes(
  demo,
  [
    "Plan 06.10 signs off `install_operations_workflow_demo(company_id)`",
    "runs, evidence, review, exceptions, automation, and execution quality analytics",
  ],
  "demo script",
);

requireIncludes(
  demoReport,
  [
    "Plan 06.10 completed the operations workflow signoff",
    "opening, closing, cleaning, and food-safety workflows",
    "execution quality analytics",
  ],
  "demo report",
);

requireIncludes(
  report,
  [
    "install_operations_workflow_demo(company_id)",
    "operations_workflow_demo_readiness_v",
    "Plan 06 is now closed",
    "Plan 07: AI Copilot And Automation",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:operations-workflow-signoff",
    "scripts/check-operations-workflow-signoff-contract.mjs",
    "supabase/tests/phase6_operations_workflow_signoff.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK operations workflow signoff contract\n");
