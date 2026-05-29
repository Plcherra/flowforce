import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { calculateScheduleLaborCost } from "@/services/costing/scheduleLabor";
import { logger } from "@/utils/logger";

type ScheduleRow = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
  break_minutes: number | null;
  user_id: string | null;
  status: string | null;
  is_published: boolean | null;
  required_headcount: number | null;
  requirements: Record<string, unknown> | null;
};

type TaskRow = {
  id: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  completed_at: string | null;
};

type InventoryItemRow = {
  id: string;
  unit_quantity: number | null;
  min_stock_level: number | null;
  max_stock_level: number | null;
  is_active: boolean | null;
};

type PurchaseRow = {
  id: string;
  expected_date: string | null;
  status: string | null;
  total_amount: number | null;
};

type CostEngineSummaryRow = {
  total_operating_cost: number | null;
  labor_cost: number | null;
  production_cost: number | null;
  waste_cost: number | null;
  purchasing_cost: number | null;
  expense_cost: number | null;
  payment_cost: number | null;
  shortage_item_count: number | null;
  overstaffed_shift_count: number | null;
  understaffed_shift_count: number | null;
};

export type OperatorCommandCenterData = {
  laborHoursToday: number;
  laborCostToday: number;
  totalOperatingCostToday: number;
  productionCostToday: number;
  wasteCostToday: number;
  purchasingCostToday: number;
  expenseCostToday: number;
  paymentCostToday: number;
  shortageSignalsToday: number;
  overstaffedShiftsToday: number;
  understaffedShiftsToday: number;
  unassignedShiftsToday: number;
  draftShiftsToday: number;
  openTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  lowStockItems: number;
  activeInventoryItems: number;
  openPurchases: number;
  overduePurchases: number;
  openPurchaseValue: number;
};

const DEFAULT_DATA: OperatorCommandCenterData = {
  laborHoursToday: 0,
  laborCostToday: 0,
  totalOperatingCostToday: 0,
  productionCostToday: 0,
  wasteCostToday: 0,
  purchasingCostToday: 0,
  expenseCostToday: 0,
  paymentCostToday: 0,
  shortageSignalsToday: 0,
  overstaffedShiftsToday: 0,
  understaffedShiftsToday: 0,
  unassignedShiftsToday: 0,
  draftShiftsToday: 0,
  openTasks: 0,
  overdueTasks: 0,
  highPriorityTasks: 0,
  lowStockItems: 0,
  activeInventoryItems: 0,
  openPurchases: 0,
  overduePurchases: 0,
  openPurchaseValue: 0,
};

const terminalTaskStatuses = new Set([
  "done",
  "complete",
  "completed",
  "closed",
  "cancelled",
  "canceled",
]);

const closedPurchaseStatuses = new Set([
  "received",
  "complete",
  "completed",
  "closed",
  "cancelled",
  "canceled",
]);

function getLocalDateIso(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function isOpenTask(row: TaskRow) {
  const status = (row.status ?? "").toLowerCase();
  return !row.completed_at && !terminalTaskStatuses.has(status);
}

function isHighPriority(row: TaskRow) {
  const priority = (row.priority ?? "").toLowerCase();
  return priority === "high" || priority === "urgent" || priority === "critical";
}

function isPastDate(dateIso: string | null, todayIso: string) {
  if (!dateIso) return false;
  return dateIso.slice(0, 10) < todayIso;
}

function isLowStock(row: InventoryItemRow) {
  if (row.is_active === false) return false;
  const minimum = Number(row.min_stock_level ?? 0);
  if (!Number.isFinite(minimum) || minimum <= 0) return false;
  const current = Number(row.unit_quantity ?? 0);
  return Number.isFinite(current) && current <= minimum;
}

function toFiniteNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function fetchCostEngineSummary(params: {
  companyId: string;
  dateIso: string;
}): Promise<{ data: CostEngineSummaryRow | null; error: unknown | null }> {
  try {
    const { data, error } = await supabase
      .rpc("get_cost_engine_summary", {
        p_company_id: params.companyId,
        p_start_date: params.dateIso,
        p_end_date: params.dateIso,
      })
      .maybeSingle();

    return {
      data: (data as CostEngineSummaryRow | null) ?? null,
      error,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export function useOperatorCommandCenterData() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [data, setData] = useState<OperatorCommandCenterData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const todayIso = getLocalDateIso();
    const dayStart = `${todayIso}T00:00:00`;
    const dayEnd = `${todayIso}T23:59:59`;

    try {
      const costSummaryPromise = fetchCostEngineSummary({
        companyId,
        dateIso: todayIso,
      });

      const [
        scheduleResult,
        taskResult,
        itemResult,
        purchaseResult,
        costSummaryResult,
      ] =
        await Promise.all([
          supabase
            .from("schedules")
            .select(
              "id,start_time,end_time,hourly_rate,break_minutes,user_id,status,is_published,required_headcount,requirements",
            )
            .eq("company_id", companyId)
            .gte("start_time", dayStart)
            .lte("start_time", dayEnd),
          supabase
            .from("tasks")
            .select("id,due_date,priority,status,completed_at")
            .eq("company_id", companyId),
          supabase
            .from("inv_items")
            .select("id,unit_quantity,min_stock_level,max_stock_level,is_active")
            .eq("company_id", companyId)
            .eq("is_active", true),
          supabase
            .from("inv_purchases")
            .select("id,expected_date,status,total_amount")
            .eq("company_id", companyId),
          costSummaryPromise,
        ]);

      if (scheduleResult.error) throw scheduleResult.error;
      if (taskResult.error) throw taskResult.error;
      if (itemResult.error) throw itemResult.error;
      if (purchaseResult.error) throw purchaseResult.error;

      const schedules = (scheduleResult.data ?? []) as ScheduleRow[];
      const tasks = (taskResult.data ?? []) as TaskRow[];
      const items = (itemResult.data ?? []) as InventoryItemRow[];
      const purchases = (purchaseResult.data ?? []) as PurchaseRow[];
      if (costSummaryResult.error) {
        logger.warn("Cost engine summary unavailable for command center", {
          error: costSummaryResult.error,
          tags: ["dashboard", "operator-command-center", "cost-engine"],
        });
      }
      const costSummary = costSummaryResult.data;

      const scheduleCosts = schedules.map(calculateScheduleLaborCost);
      const laborHoursToday = scheduleCosts.reduce(
        (sum, cost) => sum + cost.plannedLaborHours,
        0,
      );
      const laborCostToday = schedules.reduce((sum, row) => {
        const cost = calculateScheduleLaborCost(row);
        return sum + (cost.plannedLaborCost ?? 0);
      }, 0);
      const unassignedShiftsToday = schedules.filter((row) => !row.user_id).length;
      const draftShiftsToday = schedules.filter(
        (row) => row.is_published === false || row.status === "draft",
      ).length;

      const openTasks = tasks.filter(isOpenTask);
      const openPurchases = purchases.filter(
        (row) => !closedPurchaseStatuses.has((row.status ?? "").toLowerCase()),
      );

      setData({
        laborHoursToday,
        laborCostToday: toFiniteNumber(
          costSummary?.labor_cost ?? laborCostToday,
        ),
        totalOperatingCostToday: toFiniteNumber(
          costSummary?.total_operating_cost,
        ),
        productionCostToday: toFiniteNumber(costSummary?.production_cost),
        wasteCostToday: toFiniteNumber(costSummary?.waste_cost),
        purchasingCostToday: toFiniteNumber(costSummary?.purchasing_cost),
        expenseCostToday: toFiniteNumber(costSummary?.expense_cost),
        paymentCostToday: toFiniteNumber(costSummary?.payment_cost),
        shortageSignalsToday: toFiniteNumber(costSummary?.shortage_item_count),
        overstaffedShiftsToday: toFiniteNumber(
          costSummary?.overstaffed_shift_count,
        ),
        understaffedShiftsToday: toFiniteNumber(
          costSummary?.understaffed_shift_count,
        ),
        unassignedShiftsToday,
        draftShiftsToday,
        openTasks: openTasks.length,
        overdueTasks: openTasks.filter((row) => isPastDate(row.due_date, todayIso))
          .length,
        highPriorityTasks: openTasks.filter(isHighPriority).length,
        lowStockItems: items.filter(isLowStock).length,
        activeInventoryItems: items.length,
        openPurchases: openPurchases.length,
        overduePurchases: openPurchases.filter((row) =>
          isPastDate(row.expected_date, todayIso),
        ).length,
        openPurchaseValue: openPurchases.reduce((sum, row) => {
          const amount = Number(row.total_amount ?? 0);
          return Number.isFinite(amount) ? sum + amount : sum;
        }, 0),
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load command center data";
      logger.error("Failed to load operator command center data", {
        error: fetchError,
        tags: ["dashboard", "operator-command-center"],
      });
      setError(message);
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refetch: fetchData,
    }),
    [data, error, fetchData, loading],
  );
}
