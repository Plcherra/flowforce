import type { InventoryCountLine, InventoryItemUnit } from "@/features/inventory/hooks/types";

export type StockPositionRow = {
  company_id?: string | null;
  item_id: string | null;
  location_id?: string | null;
  quantity_on_hand: number | null;
  stock_value?: number | null;
};

export type CountLineSummary = {
  totalLines: number;
  countedLines: number;
  missingLines: number;
  varianceLines: number;
  positiveVariance: number;
  negativeVariance: number;
  netVariance: number;
  completionPercent: number;
};

export const stockPositionKey = (
  itemId?: string | null,
  locationId?: string | null,
) => `${itemId ?? "unknown"}:${locationId ?? "all"}`;

export function buildStockPositionMap(rows: StockPositionRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.item_id) return acc;

    const quantity = Number(row.quantity_on_hand ?? 0);
    const scopedKey = stockPositionKey(row.item_id, row.location_id);
    const allLocationsKey = stockPositionKey(row.item_id, null);

    acc[scopedKey] = (acc[scopedKey] ?? 0) + quantity;
    acc[allLocationsKey] = (acc[allLocationsKey] ?? 0) + quantity;
    return acc;
  }, {});
}

export function expectedQuantityForCountUnit(
  baseExpectedQuantity: number,
  unit?: Pick<InventoryItemUnit, "conversion_factor"> | null,
) {
  const conversionFactor = Number(unit?.conversion_factor ?? 1);
  if (!Number.isFinite(baseExpectedQuantity) || baseExpectedQuantity <= 0) {
    return 0;
  }

  if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
    return baseExpectedQuantity;
  }

  return roundQuantity(baseExpectedQuantity / conversionFactor);
}

export function calculateCountVariance(
  countedQuantity?: number | null,
  expectedQuantity?: number | null,
) {
  const counted = Number(countedQuantity ?? 0);
  const expected = Number(expectedQuantity ?? 0);
  return roundQuantity(counted - expected);
}

export function summarizeCountLines(
  lines: InventoryCountLine[],
  quantities: Record<string, number> = {},
): CountLineSummary {
  const countedLines = lines.filter(
    (line) =>
      line.counted_at ||
      quantities[line.id] !== undefined ||
      Number(line.counted_quantity ?? 0) > 0,
  ).length;

  let positiveVariance = 0;
  let negativeVariance = 0;
  let varianceLines = 0;

  lines.forEach((line) => {
    const countedQuantity = quantities[line.id] ?? line.counted_quantity ?? 0;
    const variance = calculateCountVariance(
      countedQuantity,
      line.expected_quantity,
    );

    if (Math.abs(variance) > 0.0001) {
      varianceLines += 1;
      if (variance > 0) {
        positiveVariance += variance;
      } else {
        negativeVariance += variance;
      }
    }
  });

  const totalLines = lines.length;

  return {
    totalLines,
    countedLines,
    missingLines: Math.max(0, totalLines - countedLines),
    varianceLines,
    positiveVariance: roundQuantity(positiveVariance),
    negativeVariance: roundQuantity(negativeVariance),
    netVariance: roundQuantity(positiveVariance + negativeVariance),
    completionPercent: totalLines ? Math.round((countedLines / totalLines) * 100) : 0,
  };
}

export function roundQuantity(value: number, precision = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
