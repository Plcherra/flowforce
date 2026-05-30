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

const service = readText("src/services/integrations/marketmanMigrationPath.ts");
const doc = readText("docs/marketman-migration-path.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-05-marketman-migration-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "marketManMigrationDataObjects",
    "items",
    "units",
    "suppliers",
    "purchases",
    "recipes",
    "counts",
    "waste",
    "marketManTemplateMapping",
    "sampleMarketManExport",
    "validateMarketManUnitConversions",
    "buildMarketManCostBasis",
    "buildMarketManRecipeCostPreview",
    "buildMarketManWasteCostPreview",
    "buildMarketManInventorySetupCompletenessReport",
    "isMarketManMigrationPathReady",
    "weighted_purchase_average",
  ],
  "MarketMan migration service",
);

requireIncludes(
  doc,
  [
    "Items: SKU, name, category, base unit, preferred supplier, fallback unit cost.",
    "Units: unit name, abbreviation, dimension, base unit, conversion factor.",
    "Purchases: supplier, item, quantity, unit, unit cost, purchase date.",
    "Recipes: recipe item, yield, ingredients, ingredient quantities, ingredient units.",
    "Unit Conversion Validation",
    "Cost Basis Validation",
    "Cost Engine Readiness",
    "npm run check:marketman-migration",
  ],
  "MarketMan migration doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define imported data: items, units, suppliers, purchases, recipes, counts, waste.",
    "- [x] Add unit conversion validation.",
    "- [x] Add cost basis validation.",
    "- [x] Add inventory setup completeness report.",
    "09.05 MarketMan Migration Path",
    "marketman-migration-path.md",
  ],
  "Plan 09 roadmap",
);

const phaseFiveBlock = plan.match(
  /### Phase 5: MarketMan Migration Path[\s\S]*?(?=### Phase 6: POS Integration Foundation)/,
)?.[0];

if (!phaseFiveBlock || phaseFiveBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 5 still has unchecked tasks");
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
    "sample inventory export supports cost-engine calculations",
    "This is still an import/migration path, not a live provider sync.",
    "Phase 09.06",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:marketman-migration",
    "scripts/check-marketman-migration-contract.mjs",
  ],
  "package scripts",
);

const marketman = await jiti.import(
  join(root, "src/services/integrations/marketmanMigrationPath.ts"),
);

if (!marketman.isMarketManMigrationPathReady()) {
  throw new Error("MarketMan migration path readiness check failed");
}

const unitIssues = marketman.validateMarketManUnitConversions(
  marketman.sampleMarketManExport,
);

if (unitIssues.some((issue) => issue.severity === "error")) {
  throw new Error("Sample unit conversion validation should be clean");
}

const costBasis = marketman.buildMarketManCostBasis(
  marketman.sampleMarketManExport,
);

const tomatoBasis = costBasis.costBasis.find(
  (basis) => basis.itemSku === "TOMATO",
);
const bunBasis = costBasis.costBasis.find((basis) => basis.itemSku === "BUN");

if (
  tomatoBasis?.basisSource !== "weighted_purchase_average" ||
  Number(tomatoBasis.unitCost.toFixed(2)) !== 2.24 ||
  bunBasis?.basisSource !== "weighted_purchase_average" ||
  Number(bunBasis.unitCost.toFixed(2)) !== 0.48
) {
  throw new Error(
    "Sample cost basis should use converted weighted purchase averages",
  );
}

const recipePreview = marketman.buildMarketManRecipeCostPreview(
  marketman.sampleMarketManExport,
  marketman.sampleMarketManExport.recipes[0],
);

if (
  recipePreview.issues.some((issue) => issue.severity === "error") ||
  Number(recipePreview.costPerYieldUnit.toFixed(2)) !== 0.76
) {
  throw new Error(
    "Sample recipe cost preview should support cost-engine calculations",
  );
}

const wastePreview = marketman.buildMarketManWasteCostPreview(
  marketman.sampleMarketManExport,
  marketman.sampleMarketManExport.waste[0],
);

if (!wastePreview || Number(wastePreview.costImpact.toFixed(2)) !== 1.12) {
  throw new Error("Sample waste preview should produce converted cost impact");
}

const completeness = marketman.buildMarketManInventorySetupCompletenessReport(
  marketman.sampleMarketManExport,
);

if (
  !completeness.readyForTenantImport ||
  !completeness.unitConversionReady ||
  !completeness.costBasisReady ||
  !completeness.recipeCostingReady ||
  completeness.importedObjects.items !== 2
) {
  throw new Error("Sample inventory setup completeness report should be ready");
}

const invalidDataset = {
  ...marketman.sampleMarketManExport,
  units: [
    ...marketman.sampleMarketManExport.units,
    {
      name: "Broken",
      abbreviation: "broken",
      dimension: "weight",
      conversionToBase: 0,
      baseUnit: "lb",
    },
  ],
  items: [
    ...marketman.sampleMarketManExport.items,
    {
      sku: "NO_COST",
      name: "No cost item",
      unit: "lb",
    },
  ],
};

const invalidReport =
  marketman.buildMarketManInventorySetupCompletenessReport(invalidDataset);

if (
  invalidReport.readyForTenantImport ||
  !invalidReport.issues.some(
    (issue) => issue.code === "invalid_conversion_factor",
  ) ||
  !invalidReport.issues.some((issue) => issue.code === "missing_cost_basis")
) {
  throw new Error("Invalid inventory setup should block import readiness");
}

process.stdout.write("OK MarketMan migration contract\n");
