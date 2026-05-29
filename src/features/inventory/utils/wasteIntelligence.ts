import type { InventoryWaste } from "@/features/inventory/hooks/useInventoryWaste";

export type WasteTrendDirection = "up" | "down" | "flat";

export type WasteSummary = {
  totalRecords: number;
  totalQuantity: number;
  totalCost: number;
  currentPeriodCost: number;
  previousPeriodCost: number;
  trendDirection: WasteTrendDirection;
  trendPercent: number;
  topWasteType: string | null;
  topItemName: string | null;
  topLocationName: string | null;
  outlierCount: number;
};

export type WasteOutlier = InventoryWaste & {
  outlier_score: number;
};

const toDateValue = (value?: string | null) =>
  value ? new Date(value).getTime() : 0;

const wasteCost = (record: Pick<InventoryWaste, "cost_impact">) =>
  Number(record.cost_impact ?? 0);

const addToBucket = (
  bucket: Map<string, number>,
  key: string | null | undefined,
  value: number,
) => {
  const normalizedKey = key?.trim();
  if (!normalizedKey) return;
  bucket.set(normalizedKey, (bucket.get(normalizedKey) ?? 0) + value);
};

const topBucketKey = (bucket: Map<string, number>) => {
  let topKey: string | null = null;
  let topValue = 0;

  bucket.forEach((value, key) => {
    if (value > topValue) {
      topKey = key;
      topValue = value;
    }
  });

  return topKey;
};

export function calculateWasteOutliers(records: InventoryWaste[]): WasteOutlier[] {
  const costValues = records.map(wasteCost).filter((value) => value > 0);
  if (costValues.length < 2) return [];

  const average =
    costValues.reduce((sum, value) => sum + value, 0) / costValues.length;
  const variance =
    costValues.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    costValues.length;
  const standardDeviation = Math.sqrt(variance);
  const threshold = Math.max(average * 2, average + standardDeviation);

  return records
    .map((record) => ({
      ...record,
      outlier_score: average > 0 ? wasteCost(record) / average : 0,
    }))
    .filter((record) => wasteCost(record) >= threshold)
    .sort((a, b) => wasteCost(b) - wasteCost(a));
}

export function summarizeWasteIntelligence(
  records: InventoryWaste[],
  now: Date = new Date(),
): WasteSummary {
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
  const previousPeriodStart = new Date(now);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);

  const typeCost = new Map<string, number>();
  const itemCost = new Map<string, number>();
  const locationCost = new Map<string, number>();

  let totalQuantity = 0;
  let totalCost = 0;
  let currentPeriodCost = 0;
  let previousPeriodCost = 0;

  records.forEach((record) => {
    const cost = wasteCost(record);
    const recordDate = toDateValue(record.waste_date ?? record.created_at);
    totalQuantity += Number(record.quantity ?? 0);
    totalCost += cost;

    addToBucket(typeCost, record.waste_type, cost);
    addToBucket(itemCost, record.item?.name, cost);
    addToBucket(locationCost, record.location?.name, cost);

    if (recordDate >= currentPeriodStart.getTime()) {
      currentPeriodCost += cost;
    } else if (recordDate >= previousPeriodStart.getTime()) {
      previousPeriodCost += cost;
    }
  });

  const trendDelta = currentPeriodCost - previousPeriodCost;
  const trendPercent =
    previousPeriodCost > 0
      ? (trendDelta / previousPeriodCost) * 100
      : currentPeriodCost > 0
        ? 100
        : 0;

  const trendDirection: WasteTrendDirection =
    Math.abs(trendPercent) < 1 ? "flat" : trendPercent > 0 ? "up" : "down";

  return {
    totalRecords: records.length,
    totalQuantity,
    totalCost,
    currentPeriodCost,
    previousPeriodCost,
    trendDirection,
    trendPercent,
    topWasteType: topBucketKey(typeCost),
    topItemName: topBucketKey(itemCost),
    topLocationName: topBucketKey(locationCost),
    outlierCount: calculateWasteOutliers(records).length,
  };
}
