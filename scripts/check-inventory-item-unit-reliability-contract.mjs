#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/inventory-item-unit-reliability.md",
  "src/features/inventory/utils/itemSetupHealth.ts",
  "src/utils/inventoryUnits.ts",
  "src/features/inventory/repositories/itemsRepository.ts",
  "src/features/inventory/pages/ItemsSetup.tsx",
  "supabase/migrations/20260528000200_phase5_inventory_item_unit_reliability.sql",
];

function fail(message) {
  process.stderr.write(`Inventory reliability contract failed: ${message}\n`);
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    fail(`missing ${file}`);
  }
}

const docs = readFileSync(
  join(root, "docs/inventory-item-unit-reliability.md"),
  "utf8",
);
const units = readFileSync(join(root, "src/utils/inventoryUnits.ts"), "utf8");
const health = readFileSync(
  join(root, "src/features/inventory/utils/itemSetupHealth.ts"),
  "utf8",
);
const repository = readFileSync(
  join(root, "src/features/inventory/repositories/itemsRepository.ts"),
  "utf8",
);
const page = readFileSync(
  join(root, "src/features/inventory/pages/ItemsSetup.tsx"),
  "utf8",
);
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260528000200_phase5_inventory_item_unit_reliability.sql",
  ),
  "utf8",
);
const roadmap = readFileSync(
  join(root, "docs/roadmap/05-inventory-finance-cost-engine.md"),
  "utf8",
);

for (const term of [
  "inv_items",
  "inv_item_units",
  "inv_units",
  "inv_locations",
  "inv_suppliers",
  "cost_per_unit",
  "conversion_factor",
  "setup_health",
  "missing_cost",
  "missing_location",
  "missing_supplier",
  "invalid_item_unit_conversion",
]) {
  if (!docs.includes(term)) {
    fail(`docs missing ${term}`);
  }
}

for (const symbol of [
  "tryGetConversionFactor",
  "canConvertUnits",
  'status: "ready"',
  'status: "invalid"',
  'status: "cycle"',
]) {
  if (!units.includes(symbol)) {
    fail(`inventoryUnits missing ${symbol}`);
  }
}

for (const symbol of [
  "buildInventoryItemSetupHealth",
  "summarizeSetupHealth",
  "InventorySetupHealth",
]) {
  if (!health.includes(symbol)) {
    fail(`itemSetupHealth missing ${symbol}`);
  }
}

if (!repository.includes("buildInventoryItemSetupHealth")) {
  fail("itemsRepository does not attach setup health");
}

if (!repository.includes("tryGetConversionFactor")) {
  fail("itemsRepository does not use strict conversion checks");
}

if (!page.includes("setupSummary") || !page.includes("getSetupBadge")) {
  fail("ItemsSetup page does not surface setup completeness");
}

for (const constraint of [
  "inv_items_cost_per_unit_nonnegative",
  "inv_item_units_conversion_factor_positive",
  "inv_units_conversion_factor_positive",
  "inv_stock_lots_quantity_nonnegative",
]) {
  if (!migration.includes(constraint)) {
    fail(`migration missing ${constraint}`);
  }
}

const phaseTwoBlock = roadmap.match(
  /### Phase 2: Inventory Item And Unit Reliability[\s\S]*?### Phase 3:/,
)?.[0];

if (!phaseTwoBlock) {
  fail("roadmap missing Phase 2 block");
}

if (phaseTwoBlock.includes("- [ ]")) {
  fail("Phase 2 still has unchecked tasks");
}

if (!phaseTwoBlock.includes("docs/inventory-item-unit-reliability.md")) {
  fail("Phase 2 status must link reliability doc");
}

process.stdout.write("OK inventory item/unit reliability contract\n");
