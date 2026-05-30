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

const doc = readText("docs/recipe-production-costing.md");
const production = readText("src/lib/inventory/production.ts");
const service = readText("src/features/inventory/services/inventoryService.ts");
const form = readText(
  "src/features/inventory/components/ProductionEventForm.tsx",
);
const migration = readText(
  "supabase/migrations/20260528000300_phase5_recipe_production_costing_contract.sql",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "inv_recipes",
    "inv_production_events",
    "inv_production_materials",
    "inv_adjustments",
    "inv_waste",
    "unit_output_cost",
    "Actual yield",
    "Production cannot be recorded",
  ],
  "recipe production costing doc",
);

requireIncludes(
  production,
  [
    "buildUnitMetaIndex",
    "tryGetConversionFactor",
    "yieldQuantityInItemUnit",
    "wasteQuantityInItemUnit",
    "costedOutputQuantity",
    "unitOutputCost",
    "canRecord",
    "blockingIssues",
    "canDeductInventory",
    "costStatus",
  ],
  "production calculation",
);

requireIncludes(
  service,
  [
    "calculation.canRecord",
    "calculation.blockingIssues",
    "calculation.unitOutputCost",
    "inv_production_materials",
    "inv_adjustments",
    "production_consumption",
    "inv_waste",
    "production_waste",
    "reference_number",
  ],
  "production service",
);

requireIncludes(
  form,
  [
    "preview?.canRecord",
    "preview.blockingIssues",
    "Production cannot be recorded yet",
    "material.warning",
    "calculateProductionMaterials",
  ],
  "production form",
);

requireIncludes(
  migration,
  [
    "inv_recipes_quantity_needed_positive",
    "inv_production_events_produced_quantity_positive",
    "inv_production_events_costs_nonnegative",
    "inv_production_materials_costs_nonnegative",
    "inv_adjustments_production_reference_idx",
    "inv_waste_production_reason_idx",
  ],
  "production costing migration",
);

requireIncludes(
  roadmap,
  [
    "Connect recipe ingredients to item costs.",
    "Calculate produced item cost.",
    "Record production events and material usage.",
    "Track yield and waste.",
    "05.03 Recipe And Production Costing",
    "docs/recipe-production-costing.md",
  ],
  "roadmap phase 05.03",
);

if (roadmap.includes("- [ ] Connect recipe ingredients to item costs.")) {
  throw new Error("roadmap phase 05.03 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Recipe and production costing are fully connected."],
  "launch checklist",
);

process.stdout.write("OK recipe production costing contract\n");
