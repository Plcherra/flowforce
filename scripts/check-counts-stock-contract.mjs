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

const doc = readText("docs/counts-stock-position.md");
const stockPosition = readText("src/features/inventory/utils/stockPosition.ts");
const repository = readText(
  "src/features/inventory/repositories/countsRepository.ts",
);
const countDetail = readText("src/features/inventory/routes/CountDetail.tsx");
const countTable = readText(
  "src/features/inventory/components/MarketManCountingInterface.tsx",
);
const migration = readText(
  "supabase/migrations/20260528000400_phase5_counts_stock_position_contract.sql",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "inv_stock_positions",
    "inv_stock_lots",
    "inv_adjustments",
    "expected_quantity",
    "variance",
    "Missing lines",
    "Supervisor Review",
  ],
  "counts stock doc",
);

requireIncludes(
  stockPosition,
  [
    "buildStockPositionMap",
    "expectedQuantityForCountUnit",
    "calculateCountVariance",
    "summarizeCountLines",
    "missingLines",
    "varianceLines",
    "netVariance",
  ],
  "stock position utility",
);

requireIncludes(
  repository,
  [
    "inv_stock_positions",
    "attachExpectedStockToItems",
    "expectedQuantityForCountUnit",
    "variance",
    "getCountLocationIds",
  ],
  "counts repository",
);

requireIncludes(
  countDetail,
  ["summarizeCountLines", "Missing", "Variance Lines", "Net Variance"],
  "count detail",
);

requireIncludes(
  countTable,
  [
    "calculateCountVariance",
    "summarizeCountLines",
    "Missing",
    "Variance",
    "Net variance",
  ],
  "counting table",
);

requireIncludes(
  migration,
  [
    "create or replace view public.inv_stock_positions",
    "security_invoker",
    "inv_count_lines_expected_quantity_nonnegative",
    "inv_count_lines_counted_quantity_nonnegative",
    "inv_count_lines_count_item_unit_idx",
    "inv_counts_company_date_period_idx",
  ],
  "counts stock migration",
);

requireIncludes(
  roadmap,
  [
    "Finish day-start/day-end count workflows.",
    "Calculate expected versus counted stock.",
    "Surface variance and missing counts.",
    "Add supervisor review.",
    "05.04 Counts And Stock Position",
    "docs/counts-stock-position.md",
  ],
  "roadmap phase 05.04",
);

if (roadmap.includes("- [ ] Finish day-start/day-end count workflows.")) {
  throw new Error("roadmap phase 05.04 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Counts and stock position rollups are reliable."],
  "launch checklist",
);

process.stdout.write("OK counts stock position contract\n");
