import assert from "node:assert/strict";
import {
  buildCountApprovalAdjustments,
  clampCountedQuantity,
  countLowStockItems,
  isLowStock,
  summarizeItemStock,
  totalStockValue,
} from "./stockPosition";
import {
  buildInventoryItemSetupHealth,
  isCatalogReadyForCounts,
} from "./itemSetupHealth";
import { buildUnitMetaIndex } from "@/utils/inventoryUnits";
import type { InventoryItem } from "@/features/inventory/hooks/types";

export function runInventoryCatalogHonestyTests() {
  const stock = summarizeItemStock([
    {
      item_id: "salmon",
      location_id: "walk-in",
      quantity_on_hand: 0,
      stock_value: 0,
    },
  ]);

  assert.equal(stock.salmon.onHand, 0);
  assert.equal(stock.salmon.value, 0);
  assert.equal(isLowStock(0, 5), true);
  assert.equal(isLowStock(5, 5), false);
  assert.equal(isLowStock(0, 0), false);
  assert.equal(
    countLowStockItems([{ id: "salmon", min_stock_level: 5 }], stock),
    1,
  );
  assert.equal(totalStockValue(stock), 0);

  const incompleteItem = {
    id: "salmon",
    name: "Salmon",
    unitid: "",
    is_active: true,
    company_id: "co-1",
    created_by: "user-1",
    created_at: "",
    updated_at: "",
  } as InventoryItem;

  const blocked = buildInventoryItemSetupHealth(
    incompleteItem,
    buildUnitMetaIndex([]),
  );
  assert.equal(blocked.status, "incomplete");
  assert.ok(blocked.issues.some((issue) => issue.code === "missing_unit"));
  assert.ok(blocked.issues.some((issue) => issue.code === "missing_location"));

  assert.equal(
    isCatalogReadyForCounts({ locationCount: 0, items: [{ unitid: "lb" }] }),
    false,
  );
  assert.equal(
    isCatalogReadyForCounts({
      locationCount: 1,
      items: [{ unitid: "lb" }],
    }),
    true,
  );
}

export function runInventoryCountHonestyTests() {
  assert.equal(clampCountedQuantity(-4), 0);
  assert.equal(clampCountedQuantity("10"), 10);
  assert.equal(clampCountedQuantity("nope"), 0);

  const adjustments = buildCountApprovalAdjustments({
    countId: "count-1",
    companyId: "co-1",
    userId: "user-1",
    adjustmentDate: "2026-09-18",
    locationId: "walk-in",
    lines: [
      {
        id: "line-1",
        item_id: "salmon",
        counted_quantity: 10,
        expected_quantity: 0,
        conversion_factor: 1,
      },
      {
        id: "line-2",
        item_id: "unchanged",
        counted_quantity: 4,
        expected_quantity: 4,
        conversion_factor: 1,
      },
    ],
    itemCosts: {
      salmon: { cost_per_unit: 12, default_location_id: "walk-in" },
      unchanged: { cost_per_unit: 3 },
    },
  });

  assert.equal(adjustments.length, 1);
  assert.equal(adjustments[0]?.adjustment_type, "increase");
  assert.equal(adjustments[0]?.quantity, 10);
  assert.equal(adjustments[0]?.cost_impact, 120);
  assert.equal(adjustments[0]?.location_id, "walk-in");

  const shortage = buildCountApprovalAdjustments({
    countId: "count-2",
    companyId: "co-1",
    userId: "user-1",
    adjustmentDate: "2026-09-18",
    locationId: "walk-in",
    lines: [
      {
        id: "line-3",
        item_id: "salmon",
        counted_quantity: 8,
        expected_quantity: 10,
        conversion_factor: 1,
      },
    ],
    itemCosts: { salmon: { cost_per_unit: 12 } },
  });

  assert.equal(shortage[0]?.adjustment_type, "decrease");
  assert.equal(shortage[0]?.quantity, 2);
  assert.equal(shortage[0]?.cost_impact, 24);
}
