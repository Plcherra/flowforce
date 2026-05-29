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

const doc = readText("docs/owner-financial-overview.md");
const migration = readText(
  "supabase/migrations/20260528000900_phase5_owner_financial_overview.sql",
);
const hook = readText("src/hooks/useFinancialManagement.ts");
const component = readText(
  "src/features/inventory/components/expenses/ManagerFinancialOverview.tsx",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Actual revenue",
    "Imported cost",
    "Estimated cost",
    "Pending approvals",
    "owner_financial_daily_v",
    "get_owner_financial_overview",
  ],
  "owner financial overview doc",
);

requireIncludes(
  migration,
  [
    "add column if not exists data_source",
    "owner_financial_daily_v",
    "owner_financial_export_v",
    "get_owner_financial_overview",
    "get_owner_financial_export",
    "actual_revenue",
    "imported_cost",
    "estimated_cost",
    "pending_expense_total",
    "pending_payment_total",
    "security invoker",
    "current_user_company_ids",
    "not ilike 'DEMO-%'",
  ],
  "owner financial overview migration",
);

requireIncludes(
  hook,
  [
    "OwnerFinancialOverview",
    "get_owner_financial_overview",
    "actualRevenue",
    "importedCost",
    "estimatedCost",
    "pendingApprovalTotal",
    "netOperatingPosition",
  ],
  "financial management hook",
);

requireIncludes(
  component,
  [
    "Owner Financial Overview",
    "Actual, imported, and estimated operating data kept separate",
    "Export summary",
    "Actual revenue",
    "Imported cost",
    "Estimated cost",
    "Payment Approvals",
    "Total Pending",
  ],
  "manager financial overview component",
);

if (
  component.includes("Generate Sample Data") ||
  component.includes("generateFinancialDemoData")
) {
  throw new Error("manager financial overview still exposes sample data generation");
}

requireIncludes(
  roadmap,
  [
    "Finish owner P&L-style overview.",
    "Separate real data, estimated data, and imported data.",
    "Add approvals for expenses/payments.",
    "Add exportable summaries.",
    "05.09 Owner Financial Overview",
    "docs/owner-financial-overview.md",
  ],
  "roadmap phase 05.09",
);

if (roadmap.includes("- [ ] Finish owner P&L-style overview.")) {
  throw new Error("roadmap phase 05.09 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Owner financial overview separates actual, estimated, and imported data."],
  "launch checklist",
);

requireIncludes(
  packageJson,
  [
    "check:owner-financial-overview",
    "scripts/check-owner-financial-overview-contract.mjs",
  ],
  "package scripts",
);

process.stdout.write("OK owner financial overview contract\n");
