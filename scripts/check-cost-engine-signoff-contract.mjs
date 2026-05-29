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

const signoff = readText("docs/cost-engine-signoff.md");
const canonical = readText("docs/cost-engine-canonical-model.md");
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const demo = readText("docs/roadmap/01-product-positioning-and-scope.md");
const demoReport = readText(
  "docs/roadmap/reports/01-08-sales-narrative-and-demo-script-2026-05-27.md",
);
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");
const dbRegression = readText(
  "supabase/tests/phase5_cost_engine_regression.test.sql",
);
const signoffMigration = readText(
  "supabase/migrations/20260528001000_phase5_cost_engine_signoff_grants.sql",
);
const closureMigration = readText(
  "supabase/migrations/20260528001100_phase5_cost_basis_artifact_closure.sql",
);
const financialDemoData = readText(
  "src/features/inventory/services/financialDemoData.ts",
);
const packageJson = readText("package.json");
const contract = JSON.parse(
  readText("src/services/costing/costEngineContract.json"),
);

requireIncludes(
  signoff,
  [
    "connected operating cost engine",
    "what the next shift will cost",
    "20260528001100_phase5_cost_basis_artifact_closure.sql",
    "Regression Coverage",
    "`manual` or `system`",
    "imported",
    "estimated",
    "pending",
    "sample",
    "npm run check:cost-engine-signoff",
  ],
  "cost engine signoff doc",
);

requireIncludes(
  canonical,
  [
    "owner_financial_daily_v",
    "owner_financial_export_v",
    "get_owner_financial_overview",
    "get_owner_financial_export",
    "Phase 05.10 signs off the cost engine",
  ],
  "canonical cost model",
);

for (const artifact of [
  "owner_financial_daily_v",
  "owner_financial_export_v",
]) {
  if (!contract.plannedArtifacts.views.includes(artifact)) {
    throw new Error(`cost engine contract missing view artifact: ${artifact}`);
  }
}

for (const artifact of [
  "get_owner_financial_overview",
  "get_owner_financial_export",
]) {
  if (!contract.plannedArtifacts.rpcs.includes(artifact)) {
    throw new Error(`cost engine contract missing RPC artifact: ${artifact}`);
  }
}

requireIncludes(
  dbRegression,
  [
    "planned_labor_cost",
    "production_cost",
    "waste_cost",
    "get_cost_engine_summary",
    "get_owner_financial_overview",
    "imported_cost",
    "estimated_cost",
    "pending_expense_total + pending_payment_total",
    "DEMO-FIN-SALE",
    "data_source",
    "sample",
  ],
  "cost engine regression test",
);

requireIncludes(
  signoffMigration,
  [
    "grant select on public.inv_stock_positions",
    "grant select on public.cost_purchase_receipts_v",
    "grant select on public.cost_waste_events_v",
    "grant select on public.cost_waste_daily_v",
  ],
  "cost engine signoff grant migration",
);

requireIncludes(
  closureMigration,
  [
    "cost_item_unit_basis_v",
    "cost_inventory_position_v",
    "recalculate_item_cost_basis",
    "coalesce(data_source, 'manual')) <> 'sample'",
    "Demo Financial%",
  ],
  "cost basis artifact closure migration",
);

requireIncludes(
  financialDemoData,
  [
    'data_source: "sample"',
    'source_system: "demo_generator"',
    "export_metadata",
    "metadata",
  ],
  "financial demo data seeder",
);

requireIncludes(
  packageJson,
  [
    "check:cost-engine-signoff",
    "scripts/check-cost-engine-signoff-contract.mjs",
    "supabase/tests/phase5_cost_engine_regression.test.sql",
  ],
  "package scripts",
);

requireIncludes(
  roadmap,
  [
    "Add regression tests for key calculations.",
    "Add product copy for the differentiator.",
    "Update demo script and seed data.",
    "Update roadmap status.",
    "05.10 Cost Engine Signoff",
    "docs/cost-engine-signoff.md",
  ],
  "Plan 05 roadmap",
);

const phaseTenBlock = roadmap.match(
  /### Phase 10: Cost Engine Signoff[\s\S]*$/,
)?.[0];

if (!phaseTenBlock || phaseTenBlock.includes("- [ ]")) {
  throw new Error("Plan 05 phase 10 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [06 Operations Workflows And Compliance]",
    "[x] 5.  Inventory finance cost engine",
  ],
  "master roadmap",
);

requireIncludes(
  demo,
  [
    "actual revenue/cost, imported cost, estimated operating cost, pending approvals",
    "Source-labeled financial records",
  ],
  "demo script",
);

requireIncludes(
  demoReport,
  [
    "Source-labeled financial records",
    "label sample records as `sample` and imported records as `imported`",
  ],
  "demo report",
);

requireIncludes(
  checklist,
  [
    "[x] Demo-only data is removed from production-facing flows.",
    "[x] Cost engine regression tests cover key labor, production, waste, owner finance, and demo-exclusion calculations.",
  ],
  "launch checklist",
);

process.stdout.write("OK cost engine signoff contract\n");
