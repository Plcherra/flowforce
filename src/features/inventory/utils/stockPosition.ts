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

export function clampCountedQuantity(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export type CountApprovalLine = {
  id: string;
  item_id: string;
  counted_quantity?: number | null;
  expected_quantity?: number | null;
  conversion_factor?: number | null;
};

export type CountApprovalItemCost = {
  cost_per_unit?: number | null;
  default_location_id?: string | null;
};

export type CountApprovalAdjustment = {
  company_id: string;
  item_id: string;
  location_id: string | null;
  adjustment_type: "increase" | "decrease";
  quantity: number;
  reason: string;
  reference_number: string;
  cost_impact: number;
  adjusted_by: string;
  adjustment_date: string;
  metadata: {
    source: "count_approval" | "count_correction";
    count_id: string;
    line_id: string;
    unit_cost: number;
  };
};

export function buildCountApprovalAdjustments(input: {
  countId: string;
  companyId: string;
  userId: string;
  adjustmentDate: string;
  locationId?: string | null;
  reasonPrefix?: "count_approval" | "count_correction";
  lines: CountApprovalLine[];
  itemCosts: Record<string, CountApprovalItemCost>;
}): CountApprovalAdjustment[] {
  return input.lines.flatMap((line) => {
    const counted = clampCountedQuantity(line.counted_quantity);
    const expected = Number(line.expected_quantity ?? 0);
    const conversion = Number(line.conversion_factor ?? 1);
    const safeConversion =
      Number.isFinite(conversion) && conversion > 0 ? conversion : 1;
    const baseVariance = roundQuantity(
      calculateCountVariance(counted, expected) * safeConversion,
    );
    if (Math.abs(baseVariance) <= 0.0001) return [];

    const quantity = Math.abs(baseVariance);
    const item = input.itemCosts[line.item_id] ?? {};
    const unitCost = Number(item.cost_per_unit ?? 0);
    const safeUnitCost = Number.isFinite(unitCost) ? Math.max(0, unitCost) : 0;
    const source = input.reasonPrefix ?? "count_approval";

    return [
      {
        company_id: input.companyId,
        item_id: line.item_id,
        location_id: input.locationId ?? item.default_location_id ?? null,
        adjustment_type: baseVariance > 0 ? "increase" : "decrease",
        quantity,
        reason: `${source}:${input.countId}`,
        reference_number: input.countId,
        cost_impact: roundQuantity(quantity * safeUnitCost),
        adjusted_by: input.userId,
        adjustment_date: input.adjustmentDate,
        metadata: {
          source,
          count_id: input.countId,
          line_id: line.id,
          unit_cost: safeUnitCost,
        },
      },
    ];
  });
}

export type ItemStockSummary = {
  itemId: string;
  onHand: number;
  value: number;
};

export function summarizeItemStock(
  rows: StockPositionRow[],
): Record<string, ItemStockSummary> {
  return rows.reduce<Record<string, ItemStockSummary>>((acc, row) => {
    if (!row.item_id) return acc;

    const current = acc[row.item_id] ?? {
      itemId: row.item_id,
      onHand: 0,
      value: 0,
    };

    current.onHand = roundQuantity(
      current.onHand + Number(row.quantity_on_hand ?? 0),
    );
    current.value = roundQuantity(
      current.value + Number(row.stock_value ?? 0),
    );
    acc[row.item_id] = current;
    return acc;
  }, {});
}

export function isLowStock(
  onHand: number,
  minStockLevel?: number | null,
) {
  const min = Number(minStockLevel);
  if (!Number.isFinite(min) || min <= 0) return false;
  return Number(onHand ?? 0) < min;
}

export function countLowStockItems(
  items: Array<{ id: string; min_stock_level?: number | null }>,
  stockByItem: Record<string, ItemStockSummary>,
) {
  return items.filter((item) =>
    isLowStock(stockByItem[item.id]?.onHand ?? 0, item.min_stock_level),
  ).length;
}

export function totalStockValue(stockByItem: Record<string, ItemStockSummary>) {
  return Object.values(stockByItem).reduce(
    (sum, row) => roundQuantity(sum + row.value),
    0,
  );
}
