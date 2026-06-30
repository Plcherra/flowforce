import { useMemo } from "react";
import { InventoryItem, InventoryItemUnit } from "./types";

export interface CountData {
  item_id: string;
  unit_counts: Record<string, number>;
}

export function useCountingStats(
  counts: Record<string, CountData>,
  allItems: InventoryItem[],
) {
  const calculateItemTotalPrice = (
    item: InventoryItem,
    count: CountData,
  ): number => {
    if (!count.unit_counts) return 0;

    const units: InventoryItemUnit[] =
      item.units && item.units.length > 0
        ? item.units
        : [
            {
              id: `${item.id}-base`,
              item_id: item.id,
              unitid: item.unitid,
              unit_level: 1,
              conversion_factor: 1,
              is_primary: true,
              is_countable: true,
              cost_per_unit: item.cost_per_unit ?? null,
              unit: item.unit,
            } as InventoryItemUnit,
          ];

    const baseCost = item.calculated_cost_per_unit ?? item.cost_per_unit ?? 0;

    return Object.entries(count.unit_counts).reduce(
      (total, [unitId, quantity]) => {
        if (!quantity || quantity <= 0) return total;

        const unit = units.find((u) => (u.id || u.unitid) === unitId);
        const unitCost =
          unit?.cost_per_unit ?? baseCost * (unit?.conversion_factor || 1);

        return total + quantity * (unitCost || 0);
      },
      0,
    );
  };

  const calculateVariance = (item: InventoryItem, count: CountData): number => {
    if (!count.unit_counts) return 0;

    const units: InventoryItemUnit[] =
      item.units && item.units.length > 0
        ? item.units
        : [
            {
              id: `${item.id}-base`,
              item_id: item.id,
              unitid: item.unitid,
              unit_level: 1,
              conversion_factor: 1,
              is_primary: true,
              is_countable: true,
              cost_per_unit: item.cost_per_unit ?? null,
              unit: item.unit,
            } as InventoryItemUnit,
          ];

    const totalCountedInBase = Object.entries(count.unit_counts).reduce(
      (sum, [unitId, qty]) => {
        if (!qty || qty <= 0) return sum;
        const unit = units.find((u) => (u.id || u.unitid) === unitId);
        const factor = unit?.conversion_factor || 1;
        return sum + qty * factor;
      },
      0,
    );

    const expected = item.min_stock_level || 0;
    return totalCountedInBase - expected;
  };

  const getVarianceStatus = (variance: number) => {
    const absVariance = Math.abs(variance);
    if (absVariance <= 2) return { status: "good", color: "text-green-600" };
    if (absVariance <= 5)
      return { status: "warning", color: "text-yellow-600" };
    return { status: "error", color: "text-red-600" };
  };

  const stats = useMemo(() => {
    const totalValue = Object.values(counts).reduce((total, count) => {
      const item = allItems.find((i) => i.id === count.item_id);
      return total + (item ? calculateItemTotalPrice(item, count) : 0);
    }, 0);

    const significantVariances = Object.values(counts).filter((count) => {
      const item = allItems.find((i) => i.id === count.item_id);
      return item && Math.abs(calculateVariance(item, count)) > 5;
    }).length;

    const itemsCounted = Object.values(counts).length;

    return {
      totalValue,
      significantVariances,
      itemsCounted,
    };
  }, [counts, allItems]);

  return {
    calculateItemTotalPrice,
    calculateVariance,
    getVarianceStatus,
    stats,
  };
}
