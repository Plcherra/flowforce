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

const doc = readText("docs/waste-adjustment-intelligence.md");
const service = readText("src/features/inventory/services/inventoryService.ts");
const wasteHook = readText(
  "src/features/inventory/hooks/useInventoryWaste.tsx",
);
const actions = readText("src/features/inventory/routes/Actions.tsx");
const helpers = readText(
  "src/features/inventory/routes/inventoryActionsHelpers.ts",
);
const wastePage = readText("src/features/inventory/routes/Waste.tsx");
const intelligence = readText(
  "src/features/inventory/utils/wasteIntelligence.ts",
);
const migration = readText(
  "supabase/migrations/20260528000600_phase5_waste_adjustment_intelligence.sql",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "inv_waste",
    "inv_adjustments",
    "adjustment_type = waste",
    "cost_waste_events_v",
    "cost_waste_daily_v",
    "High-cost outliers",
  ],
  "waste intelligence doc",
);

requireIncludes(
  service,
  [
    "classifyWasteReason",
    "calculateCostImpact",
    "getInventoryCostContext",
    'adjustment_type: "waste"',
    "reason_category",
    'source: "manual_adjustment"',
  ],
  "inventory service",
);

requireIncludes(
  wasteHook,
  [
    "useCreateInventoryAdjustment",
    "CreateAdjustmentData",
    "reason_category",
    "metadata",
  ],
  "waste hook",
);

requireIncludes(
  actions,
  [
    "useCreateInventoryAdjustment",
    "createAdjustment.mutateAsync",
    "Applying...",
  ],
  "actions route",
);

requireIncludes(
  helpers,
  ["mutateAdjustment", "cost_impact", 'source: "inventory_actions_form"'],
  "actions helpers",
);

requireIncludes(
  wastePage,
  [
    "summarizeWasteIntelligence",
    "calculateWasteOutliers",
    "7-Day Trend",
    "Highest Impact",
    "Outliers",
  ],
  "waste page",
);

requireIncludes(
  intelligence,
  [
    "summarizeWasteIntelligence",
    "calculateWasteOutliers",
    "trendDirection",
    "outlier_score",
  ],
  "waste intelligence utility",
);

requireIncludes(
  migration,
  [
    "reason_category",
    "shift_id",
    "metadata",
    "inv_waste_quantity_positive",
    "inv_adjustments_cost_impact_nonnegative",
    "create or replace view public.cost_waste_events_v",
    "create or replace view public.cost_waste_daily_v",
  ],
  "waste migration",
);

requireIncludes(
  roadmap,
  [
    "Finish waste events and inventory adjustments.",
    "Classify waste by type, reason, item, location, and shift where possible.",
    "Calculate cost impact.",
    "Add trend and outlier views.",
    "05.06 Waste And Adjustment Intelligence",
    "docs/waste-adjustment-intelligence.md",
  ],
  "roadmap phase 05.06",
);

if (roadmap.includes("- [ ] Finish waste events and inventory adjustments.")) {
  throw new Error("roadmap phase 05.06 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Waste events calculate cost impact consistently."],
  "launch checklist",
);

process.stdout.write("OK waste adjustment intelligence contract\n");
