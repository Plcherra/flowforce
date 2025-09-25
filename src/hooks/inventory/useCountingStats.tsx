import { useMemo } from 'react';
import { InventoryItem } from './types';

export interface CountData {
  item_id: string;
  unit_counts: Record<string, number>;
}

export function useCountingStats(
  counts: Record<string, CountData>,
  allItems: InventoryItem[]
) {
  const calculateItemTotalPrice = (item: InventoryItem, count: CountData): number => {
    let totalPrice = 0;
    
    if (count.unit_counts) {
      Object.entries(count.unit_counts).forEach(([unitId, quantity]) => {
        if (quantity > 0) {
          const itemUnit = item.unit;
          if (itemUnit && item.cost_per_unit) {
            totalPrice += quantity * item.cost_per_unit;
          }
        }
      });
    }
    
    return totalPrice;
  };

  const calculateVariance = (item: InventoryItem, count: CountData): number => {
    const totalCounted = Object.values(count.unit_counts || {}).reduce((sum, qty) => sum + (qty || 0), 0);
    const expected = item.min_stock_level || 0;
    return totalCounted - expected;
  };

  const getVarianceStatus = (variance: number) => {
    const absVariance = Math.abs(variance);
    if (absVariance <= 2) return { status: 'good', color: 'text-green-600' };
    if (absVariance <= 5) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'error', color: 'text-red-600' };
  };

  const stats = useMemo(() => {
    const totalValue = Object.values(counts).reduce((total, count) => {
      const item = allItems.find(i => i.id === count.item_id);
      return total + (item ? calculateItemTotalPrice(item, count) : 0);
    }, 0);

    const significantVariances = Object.values(counts).filter(count => {
      const item = allItems.find(i => i.id === count.item_id);
      return item && Math.abs(calculateVariance(item, count)) > 5;
    }).length;

    const itemsCounted = Object.values(counts).length;

    return {
      totalValue,
      significantVariances,
      itemsCounted
    };
  }, [counts, allItems]);

  return {
    calculateItemTotalPrice,
    calculateVariance,
    getVarianceStatus,
    stats
  };
}