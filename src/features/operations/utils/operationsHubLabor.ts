import { calculateScheduleLaborCost } from "@/services/costing/scheduleLabor";
import {
  dayKey,
  inDayRange,
  round1,
  type HubLaborEntryRow,
  type HubSaleRow,
  type HubScheduleRow,
  type HubSeverity,
  type KpiResult,
  type OperationsHubSource,
} from "./operationsHubMetrics";

const CANCELLED = new Set(["cancelled", "canceled"]);

function activeShifts(shifts: HubScheduleRow[], start: string, end: string) {
  return shifts.filter((shift) => {
    if (shift.is_template) return false;
    if (CANCELLED.has((shift.status ?? "").toLowerCase())) return false;
    return inDayRange(dayKey(shift.start_time), start, end);
  });
}

function scheduledLabor(shifts: HubScheduleRow[]): {
  complete: boolean;
  cost: number;
} {
  if (shifts.length === 0) return { complete: true, cost: 0 };
  let cost = 0;
  let complete = true;
  for (const shift of shifts) {
    const calculated = calculateScheduleLaborCost({
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      hourly_rate: shift.hourly_rate,
      required_headcount: shift.required_headcount,
      user_id: shift.user_id,
      requirements: shift.requirements,
    });
    if (calculated.plannedLaborCost == null) {
      complete = false;
    } else {
      cost += calculated.plannedLaborCost;
    }
  }
  return { complete, cost };
}

function recordedLabor(
  entries: HubLaborEntryRow[],
  start: string,
  end: string,
): { count: number; cost: number } {
  let count = 0;
  let cost = 0;
  for (const entry of entries) {
    if (!inDayRange(dayKey(entry.work_date), start, end)) continue;
    const value = Number(entry.labor_cost);
    if (!Number.isFinite(value)) continue;
    count += 1;
    cost += value;
  }
  return { count, cost };
}

function salesTotal(sales: HubSaleRow[], start: string, end: string): number {
  return sales.reduce((sum, sale) => {
    if ((sale.transaction_type ?? "").trim().toLowerCase() !== "sale") return sum;
    if (!inDayRange(dayKey(sale.created_at), start, end)) return sum;
    const amount = Number(sale.total_amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

export function laborWindow(
  source: OperationsHubSource,
  start: string,
  end: string,
): Pick<KpiResult, "available" | "percent" | "laborBasis" | "emptyReason"> {
  const sales = salesTotal(source.sales, start, end);
  if (sales <= 0) {
    return {
      available: false,
      percent: null,
      laborBasis: null,
      emptyReason: "no_sales",
    };
  }
  const scheduled = scheduledLabor(activeShifts(source.schedules, start, end));
  if (scheduled.complete) {
    return {
      available: true,
      percent: round1((scheduled.cost / sales) * 100),
      laborBasis: "schedule",
      emptyReason: null,
    };
  }
  const recorded = recordedLabor(source.laborEntries, start, end);
  if (recorded.count > 0) {
    return {
      available: true,
      percent: round1((recorded.cost / sales) * 100),
      laborBasis: "recorded",
      emptyReason: null,
    };
  }
  return {
    available: false,
    percent: null,
    laborBasis: null,
    emptyReason: "no_labor_rate",
  };
}

export function laborSeverity(percent: number): HubSeverity {
  if (percent > 33) return "critical";
  if (percent > 28) return "warning";
  return "normal";
}
