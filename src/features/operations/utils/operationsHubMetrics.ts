import { laborSeverity, laborWindow } from "./operationsHubLabor";

export type HubKpiKey = "tasks_compliance" | "inventory_health" | "labor_vs_sales";

export type HubSeverity = "normal" | "warning" | "critical";

export type HubTaskRow = {
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
};

export type HubCatalogItem = {
  id: string;
  name: string | null;
  min_stock_level: number | null;
  is_active: boolean | null;
  location_name: string | null;
};

export type HubItemRow = HubCatalogItem & {
  on_hand: number | null;
};

export type HubScheduleRow = {
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  hourly_rate: number | null;
  required_headcount: number | null;
  user_id: string | null;
  requirements: Record<string, unknown> | null;
  is_template: boolean | null;
  status: string | null;
};

export type HubSaleRow = {
  total_amount: number | null;
  created_at: string | null;
  transaction_type: string | null;
};

export type HubLaborEntryRow = {
  labor_cost: number | null;
  work_date: string | null;
};

export type HubCountRow = {
  count_date: string | null;
  status: string | null;
  location_name: string | null;
};

export type HubWasteRow = {
  cost_impact: number | null;
  waste_date: string | null;
};

export type OperationsHubSource = {
  tasks: HubTaskRow[];
  items: HubItemRow[];
  schedules: HubScheduleRow[];
  sales: HubSaleRow[];
  laborEntries: HubLaborEntryRow[];
  counts: HubCountRow[];
  waste: HubWasteRow[];
};

export type DayWindows = {
  today: string;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

export type LaborBasis = "schedule" | "recorded";

export type LaborEmptyReason = "no_sales" | "no_labor" | "no_labor_rate";

export type KpiResult = {
  available: boolean;
  percent: number | null;
  trendPoints: number | null;
  severity: HubSeverity | null;
  emptyReason: "no_tasks" | "no_minimums" | LaborEmptyReason | null;
  laborBasis: LaborBasis | null;
};

export type LowStockItem = {
  id: string;
  name: string | null;
  locationName: string | null;
  percentOfMinimum: number;
};

export type WasteSignal = {
  kind: "empty" | "trend" | "amount";
  percentChange: number | null;
  cost: number | null;
};

export type OperationsHubModel = {
  windows: DayWindows;
  tasks: KpiResult;
  inventory: KpiResult;
  labor: KpiResult;
  countsDue: { count: number; locations: string[] };
  lowStock: LowStockItem[];
  waste: WasteSignal;
};

const CANCELLED = new Set(["cancelled", "canceled"]);
const COMPLETED = new Set(["complete", "completed", "done", "closed"]);
const CLOSED_COUNTS = new Set([
  "completed",
  "complete",
  "approved",
  "cancelled",
  "canceled",
  "rejected",
]);

const DAY_MS = 86_400_000;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatPercent(value: number): string {
  const rounded = round1(value);
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function formatSignedPoints(points: number): string {
  const rounded = round1(points);
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return rounded > 0 ? `+${body}` : body;
}

export function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function rollingDayWindows(now: Date): DayWindows {
  const todayStamp = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const key = (offsetDays: number) =>
    new Date(todayStamp + offsetDays * DAY_MS).toISOString().slice(0, 10);
  const currentStart = key(-6);
  return {
    today: key(0),
    currentStart,
    currentEnd: key(1),
    previousStart: key(-13),
    previousEnd: currentStart,
  };
}

export function inDayRange(day: string | null, start: string, end: string): boolean {
  return Boolean(day && day >= start && day < end);
}

function taskIncluded(task: HubTaskRow): boolean {
  const status = (task.status ?? "").toLowerCase();
  return !CANCELLED.has(status);
}

function taskOnTime(task: HubTaskRow): boolean {
  const status = (task.status ?? "").toLowerCase();
  if (!task.completed_at) return COMPLETED.has(status);
  const due = dayKey(task.due_date);
  const done = dayKey(task.completed_at);
  if (!due || !done) return COMPLETED.has(status);
  return done <= due;
}

function complianceWindow(
  tasks: HubTaskRow[],
  start: string,
  end: string,
): { available: boolean; percent: number | null } {
  const eligible = tasks.filter((task) => {
    if (!taskIncluded(task)) return false;
    return inDayRange(dayKey(task.due_date), start, end);
  });
  if (eligible.length === 0) return { available: false, percent: null };
  const onTime = eligible.filter(taskOnTime).length;
  return { available: true, percent: round1((onTime / eligible.length) * 100) };
}

export function taskSeverity(percent: number): HubSeverity {
  if (percent < 85) return "critical";
  if (percent < 90) return "warning";
  return "normal";
}

function isScoredItem(item: HubItemRow): boolean {
  if (item.is_active === false) return false;
  const minimum = Number(item.min_stock_level);
  return Number.isFinite(minimum) && minimum > 0;
}

export function itemsWithStockOnHand(
  items: HubCatalogItem[],
  stockByItem: Record<string, { onHand: number }>,
): HubItemRow[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    on_hand: stockByItem[item.id]?.onHand ?? 0,
    min_stock_level: item.min_stock_level,
    is_active: item.is_active,
    location_name: item.location_name,
  }));
}

function onHand(item: HubItemRow): number {
  const quantity = Number(item.on_hand ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

function isLowStock(item: HubItemRow): boolean {
  return onHand(item) <= Number(item.min_stock_level);
}

export function percentOfMinimum(item: HubItemRow): number {
  const minimum = Number(item.min_stock_level);
  if (!Number.isFinite(minimum) || minimum <= 0) return 0;
  return round1((Math.max(onHand(item), 0) / minimum) * 100);
}

export function inventorySeverity(percent: number): HubSeverity {
  if (percent < 65) return "critical";
  if (percent < 80) return "warning";
  return "normal";
}

function withTrend(
  current: Pick<KpiResult, "available" | "percent">,
  previous: Pick<KpiResult, "available" | "percent">,
): number | null {
  if (
    !current.available ||
    !previous.available ||
    current.percent == null ||
    previous.percent == null
  ) {
    return null;
  }
  return round1(current.percent - previous.percent);
}

function countIsDue(count: HubCountRow, today: string): boolean {
  if (CLOSED_COUNTS.has((count.status ?? "").toLowerCase())) return false;
  const day = dayKey(count.count_date);
  return Boolean(day && day <= today);
}

function wasteCost(rows: HubWasteRow[], start: string, end: string): number {
  return rows.reduce((sum, row) => {
    if (!inDayRange(dayKey(row.waste_date), start, end)) return sum;
    const cost = Number(row.cost_impact ?? 0);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
}

function wasteRowsInWindow(rows: HubWasteRow[], start: string, end: string): number {
  return rows.filter((row) => inDayRange(dayKey(row.waste_date), start, end)).length;
}

export function buildOperationsHub(
  source: OperationsHubSource,
  now: Date,
): OperationsHubModel {
  const windows = rollingDayWindows(now);
  const currentTasks = complianceWindow(
    source.tasks,
    windows.currentStart,
    windows.currentEnd,
  );
  const previousTasks = complianceWindow(
    source.tasks,
    windows.previousStart,
    windows.previousEnd,
  );
  const tasks: KpiResult = {
    ...currentTasks,
    trendPoints: withTrend(currentTasks, previousTasks),
    severity:
      currentTasks.percent == null ? null : taskSeverity(currentTasks.percent),
    emptyReason: currentTasks.available ? null : "no_tasks",
    laborBasis: null,
  };

  const scored = source.items.filter(isScoredItem);
  const healthy = scored.filter((item) => !isLowStock(item)).length;
  const inventoryPercent =
    scored.length === 0 ? null : round1((healthy / scored.length) * 100);
  const inventory: KpiResult = {
    available: inventoryPercent != null,
    percent: inventoryPercent,
    trendPoints: null,
    severity: inventoryPercent == null ? null : inventorySeverity(inventoryPercent),
    emptyReason: inventoryPercent == null ? "no_minimums" : null,
    laborBasis: null,
  };

  const currentLabor = laborWindow(source, windows.currentStart, windows.currentEnd);
  const previousLabor = laborWindow(
    source,
    windows.previousStart,
    windows.previousEnd,
  );
  const labor: KpiResult = {
    ...currentLabor,
    trendPoints: withTrend(currentLabor, previousLabor),
    severity:
      currentLabor.percent == null ? null : laborSeverity(currentLabor.percent),
  };

  const dueCounts = source.counts.filter((count) => countIsDue(count, windows.today));
  const locations = [
    ...new Set(
      dueCounts
        .map((count) => count.location_name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  const lowStock = scored
    .filter(isLowStock)
    .map((item) => ({
      id: item.id,
      name: item.name?.trim() || null,
      locationName: item.location_name?.trim() || null,
      percentOfMinimum: percentOfMinimum(item),
    }))
    .sort((left, right) => left.percentOfMinimum - right.percentOfMinimum);

  const currentWaste = wasteCost(source.waste, windows.currentStart, windows.currentEnd);
  const previousWaste = wasteCost(
    source.waste,
    windows.previousStart,
    windows.previousEnd,
  );
  const currentWasteRows = wasteRowsInWindow(
    source.waste,
    windows.currentStart,
    windows.currentEnd,
  );
  const previousWasteRows = wasteRowsInWindow(
    source.waste,
    windows.previousStart,
    windows.previousEnd,
  );
  let waste: WasteSignal = { kind: "empty", percentChange: null, cost: null };
  if (currentWasteRows === 0 && previousWasteRows === 0) {
    waste = { kind: "empty", percentChange: null, cost: null };
  } else if (previousWaste > 0) {
    waste = {
      kind: "trend",
      percentChange: round1(((currentWaste - previousWaste) / previousWaste) * 100),
      cost: round1(currentWaste),
    };
  } else {
    waste = { kind: "amount", percentChange: null, cost: round1(currentWaste) };
  }

  return {
    windows,
    tasks,
    inventory,
    labor,
    countsDue: { count: dueCounts.length, locations },
    lowStock,
    waste,
  };
}
