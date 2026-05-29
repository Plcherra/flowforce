import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/public-types";
import {
  endOfMonth,
  format,
  isAfter,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

type TimeEntry = Tables<"time_entries">;
type Payment = Tables<"payments">;
type Expense = Tables<"expenses">;
type InventoryTransaction = Tables<"inventory_transactions">;
type WasteEvent = Tables<"inv_waste">;

type HoursTrendPoint = {
  weekLabel: string;
  hours: number;
};

type EarningsTrendPoint = {
  date: string;
  amount: number;
};

export type EmployeeFinancialMetrics = {
  hoursThisWeek: number;
  hoursLastWeek: number;
  averageShiftLength: number;
  clockedInToday: boolean;
  weeklyHourTrend: HoursTrendPoint[];
  totalEarnings30d: number;
  pendingEarnings: number;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  earningsTrend: EarningsTrendPoint[];
  financialTips: string[];
  loading: boolean;
};

type MonthlyProfitLossPoint = {
  monthLabel: string;
  revenue: number;
  payroll: number;
  operatingExpenses: number;
  wasteImpact: number;
  inventoryPurchases: number;
  profit: number;
};

type ExpenseBreakdown = {
  label: string;
  total: number;
};

type IntegrationStatus = {
  id: "toast" | "quickbooks" | "marketman";
  name: string;
  description: string;
  status: "connected" | "pending" | "disconnected";
  lastSync: string | null;
  autoSync: boolean;
};

export type OwnerFinancialOverview = {
  startDate: string | null;
  endDate: string | null;
  actualRevenue: number;
  actualExpenses: number;
  actualPayments: number;
  importedCost: number;
  estimatedCost: number;
  estimatedLaborCost: number;
  estimatedProductionCost: number;
  estimatedWasteCost: number;
  estimatedPurchasingCost: number;
  pendingExpenseTotal: number;
  pendingExpenseCount: number;
  pendingPaymentTotal: number;
  pendingPaymentCount: number;
  pendingApprovalTotal: number;
  pendingApprovalCount: number;
  netOperatingPosition: number;
  exportRowCount: number;
  sourceBreakdown: {
    actual: number;
    imported: number;
    estimated: number;
    revenue: number;
    pending: number;
  };
  dataQualityFlags: Record<string, unknown>;
};

type OwnerFinancialOverviewRow = {
  start_date: string | null;
  end_date: string | null;
  actual_revenue: number | string | null;
  actual_expenses: number | string | null;
  actual_payments: number | string | null;
  imported_cost: number | string | null;
  estimated_cost: number | string | null;
  estimated_labor_cost: number | string | null;
  estimated_production_cost: number | string | null;
  estimated_waste_cost: number | string | null;
  estimated_purchasing_cost: number | string | null;
  pending_expense_total: number | string | null;
  pending_expense_count: number | string | null;
  pending_payment_total: number | string | null;
  pending_payment_count: number | string | null;
  net_operating_position: number | string | null;
  export_row_count: number | string | null;
  source_breakdown: unknown;
  data_quality_flags: unknown;
};

export type ManagerFinancialMetrics = {
  payrollTotal30d: number;
  payrollPendingApproval: number;
  payrollPendingApprovalCount: number;
  payrollApproved: number;
  laborCostThisWeek: number;
  vendorSpending30d: number;
  reimbursementVolume30d: number;
  expenseBreakdown: ExpenseBreakdown[];
  operatingExpenses30d: number;
  pendingExpenseTotal: number;
  pendingExpenseCount: number;
  pendingPaymentTotal: number;
  pendingPaymentCount: number;
  wasteCost30d: number;
  inventoryPurchase30d: number;
  inventorySales30d: number;
  ownerFinancialOverview: OwnerFinancialOverview;
  profitLossTrend: MonthlyProfitLossPoint[];
  profitForecastNextMonth: number;
  integrations: IntegrationStatus[];
  loading: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
};

type ManagerFinancialSnapshot = Omit<
  ManagerFinancialMetrics,
  "refresh" | "refreshing"
>;

const HOURS_IN_MILLISECOND = 1000 * 60 * 60;

function toFiniteNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function createEmptyOwnerFinancialOverview(): OwnerFinancialOverview {
  return {
    startDate: null,
    endDate: null,
    actualRevenue: 0,
    actualExpenses: 0,
    actualPayments: 0,
    importedCost: 0,
    estimatedCost: 0,
    estimatedLaborCost: 0,
    estimatedProductionCost: 0,
    estimatedWasteCost: 0,
    estimatedPurchasingCost: 0,
    pendingExpenseTotal: 0,
    pendingExpenseCount: 0,
    pendingPaymentTotal: 0,
    pendingPaymentCount: 0,
    pendingApprovalTotal: 0,
    pendingApprovalCount: 0,
    netOperatingPosition: 0,
    exportRowCount: 0,
    sourceBreakdown: {
      actual: 0,
      imported: 0,
      estimated: 0,
      revenue: 0,
      pending: 0,
    },
    dataQualityFlags: {},
  };
}

function mapOwnerFinancialOverview(
  row: OwnerFinancialOverviewRow | null,
): OwnerFinancialOverview {
  if (!row) {
    return createEmptyOwnerFinancialOverview();
  }

  const sourceBreakdown = asObject(row.source_breakdown);
  const pendingExpenseTotal = toFiniteNumber(row.pending_expense_total);
  const pendingPaymentTotal = toFiniteNumber(row.pending_payment_total);
  const pendingExpenseCount = toFiniteNumber(row.pending_expense_count);
  const pendingPaymentCount = toFiniteNumber(row.pending_payment_count);

  return {
    startDate: row.start_date,
    endDate: row.end_date,
    actualRevenue: toFiniteNumber(row.actual_revenue),
    actualExpenses: toFiniteNumber(row.actual_expenses),
    actualPayments: toFiniteNumber(row.actual_payments),
    importedCost: toFiniteNumber(row.imported_cost),
    estimatedCost: toFiniteNumber(row.estimated_cost),
    estimatedLaborCost: toFiniteNumber(row.estimated_labor_cost),
    estimatedProductionCost: toFiniteNumber(row.estimated_production_cost),
    estimatedWasteCost: toFiniteNumber(row.estimated_waste_cost),
    estimatedPurchasingCost: toFiniteNumber(row.estimated_purchasing_cost),
    pendingExpenseTotal,
    pendingExpenseCount,
    pendingPaymentTotal,
    pendingPaymentCount,
    pendingApprovalTotal: pendingExpenseTotal + pendingPaymentTotal,
    pendingApprovalCount: pendingExpenseCount + pendingPaymentCount,
    netOperatingPosition: toFiniteNumber(row.net_operating_position),
    exportRowCount: toFiniteNumber(row.export_row_count),
    sourceBreakdown: {
      actual: toFiniteNumber(sourceBreakdown.actual),
      imported: toFiniteNumber(sourceBreakdown.imported),
      estimated: toFiniteNumber(sourceBreakdown.estimated),
      revenue: toFiniteNumber(sourceBreakdown.revenue),
      pending: toFiniteNumber(sourceBreakdown.pending),
    },
    dataQualityFlags: asObject(row.data_quality_flags),
  };
}

async function fetchOwnerFinancialOverview(params: {
  companyId: string;
  startDate: string;
  endDate: string;
}): Promise<{ data: OwnerFinancialOverviewRow | null; error: unknown | null }> {
  try {
    const { data, error } = await supabase
      .rpc("get_owner_financial_overview", {
        p_company_id: params.companyId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
      })
      .maybeSingle();

    return {
      data: (data as OwnerFinancialOverviewRow | null) ?? null,
      error,
    };
  } catch (error) {
    return { data: null, error };
  }
}

function calculateWeeklyHours(entries: TimeEntry[]) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const weeklyTotals = new Map<string, number>();
  let currentClockIn: Date | null = null;
  let activeBreakStart: Date | null = null;
  let breakDurationMs = 0;
  let totalHours = 0;
  let shiftCount = 0;

  for (const entry of sorted) {
    const entryDate = new Date(entry.timestamp);

    switch (entry.entry_type) {
      case "clock_in":
        currentClockIn = entryDate;
        breakDurationMs = 0;
        activeBreakStart = null;
        break;
      case "break_start":
        if (currentClockIn) {
          activeBreakStart = entryDate;
        }
        break;
      case "break_end":
        if (currentClockIn && activeBreakStart) {
          breakDurationMs += entryDate.getTime() - activeBreakStart.getTime();
          activeBreakStart = null;
        }
        break;
      case "clock_out":
        if (currentClockIn) {
          const rawDurationMs = entryDate.getTime() - currentClockIn.getTime();
          const netDurationMs = Math.max(rawDurationMs - breakDurationMs, 0);
          const hours = netDurationMs / HOURS_IN_MILLISECOND;

          totalHours += hours;
          shiftCount += 1;

          const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
          const weekLabel = format(weekStart, "MMM d");
          weeklyTotals.set(
            weekLabel,
            (weeklyTotals.get(weekLabel) || 0) + hours,
          );

          currentClockIn = null;
          breakDurationMs = 0;
          activeBreakStart = null;
        }
        break;
      default:
        break;
    }
  }

  return {
    totalHours,
    weeklyTotals,
    averageShift: shiftCount > 0 ? totalHours / shiftCount : 0,
  };
}

function buildWeeklyTrend(
  weeklyTotals: Map<string, number>,
  weeksBack: number,
  referenceDate: Date,
): HoursTrendPoint[] {
  const trend: HoursTrendPoint[] = [];

  for (let i = weeksBack; i >= 0; i -= 1) {
    const weekStart = startOfWeek(subWeeks(referenceDate, i), {
      weekStartsOn: 1,
    });
    const label = format(weekStart, "MMM d");
    trend.push({
      weekLabel: label,
      hours: Number((weeklyTotals.get(label) || 0).toFixed(2)),
    });
  }

  return trend;
}

function calculateEarningsTrend(
  payments: Payment[],
  daysBack: number,
): EarningsTrendPoint[] {
  const today = new Date();
  const start = subWeeks(today, Math.ceil(daysBack / 7));
  const filtered = payments.filter(
    (payment) => new Date(payment.created_at) >= start,
  );

  const byDate = new Map<string, number>();
  filtered.forEach((payment) => {
    const date = format(new Date(payment.created_at), "yyyy-MM-dd");
    byDate.set(date, (byDate.get(date) || 0) + Number(payment.amount || 0));
  });

  const result: EarningsTrendPoint[] = [];
  let cursor = startOfWeek(start, { weekStartsOn: 1 });
  const end = new Date(today);

  while (!isAfter(cursor, end)) {
    const dateKey = format(cursor, "yyyy-MM-dd");
    result.push({
      date: dateKey,
      amount: Number((byDate.get(dateKey) || 0).toFixed(2)),
    });
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return result;
}

function deriveEmployeeTips(metrics: {
  hoursThisWeek: number;
  hoursLastWeek: number;
  averageShiftLength: number;
  totalEarnings30d: number;
  pendingEarnings: number;
}): string[] {
  const tips: string[] = [];

  if (metrics.hoursThisWeek > 45) {
    tips.push(
      `You logged ${metrics.hoursThisWeek.toFixed(
        1,
      )} hours this week. Consider planning rest time to avoid burnout.`,
    );
  }

  if (
    metrics.hoursThisWeek < metrics.hoursLastWeek &&
    metrics.hoursLastWeek > 0
  ) {
    const delta = metrics.hoursLastWeek - metrics.hoursThisWeek;
    tips.push(
      `Hours are down by ${delta.toFixed(
        1,
      )} compared to last week. Review your schedule to confirm coverage.`,
    );
  }

  if (metrics.pendingEarnings > 0) {
    tips.push(
      `You have $${metrics.pendingEarnings.toFixed(
        2,
      )} waiting for approval. Track reimbursement status to ensure timely payouts.`,
    );
  }

  if (metrics.averageShiftLength > 8) {
    tips.push(
      `Average shift length is ${metrics.averageShiftLength.toFixed(
        1,
      )} hours. Make sure breaks are recorded to stay compliant.`,
    );
  }

  if (!tips.length) {
    tips.push("Great work! Your hours and payouts look stable this month.");
  }

  return tips;
}

export function useEmployeeFinancialMetrics(): EmployeeFinancialMetrics {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["financial-management", "employee", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return {
          timeEntries: [] as TimeEntry[],
          earnings: [] as Payment[],
          pending: [] as Payment[],
        };
      }

      const fourWeeksAgo = subWeeks(new Date(), 8).toISOString();

      const [timeEntriesResponse, earningsResponse, pendingResponse] =
        await Promise.all([
          supabase
            .from("time_entries")
            .select("*")
            .eq("user_id", user.id)
            .gte("timestamp", fourWeeksAgo)
            .order("timestamp", { ascending: true }),
          supabase
            .from("payments")
            .select("*")
            .eq("recipient_id", user.id)
            .in("status", ["approved", "paid"])
            .in("payment_type", ["wage", "bonus", "expense_reimbursement"]),
          supabase
            .from("payments")
            .select("*")
            .eq("recipient_id", user.id)
            .eq("status", "pending")
            .in("payment_type", ["wage", "bonus", "expense_reimbursement"]),
        ]);

      if (timeEntriesResponse.error) throw timeEntriesResponse.error;
      if (earningsResponse.error) throw earningsResponse.error;
      if (pendingResponse.error) throw pendingResponse.error;

      return {
        timeEntries: (timeEntriesResponse.data as TimeEntry[]) ?? [],
        earnings: (earningsResponse.data as Payment[]) ?? [],
        pending: (pendingResponse.data as Payment[]) ?? [],
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (Phase 4 optimization)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return useMemo(() => {
    if (query.isLoading || !user?.id) {
      return {
        hoursThisWeek: 0,
        hoursLastWeek: 0,
        averageShiftLength: 0,
        clockedInToday: false,
        weeklyHourTrend: [],
        totalEarnings30d: 0,
        pendingEarnings: 0,
        lastPaymentAmount: null,
        lastPaymentDate: null,
        earningsTrend: [],
        financialTips: [],
        loading: query.isLoading,
      };
    }

    const { timeEntries, earnings, pending } = query.data ?? {
      timeEntries: [],
      earnings: [],
      pending: [],
    };

    const { weeklyTotals, averageShift } = calculateWeeklyHours(timeEntries);
    const now = new Date();
    const thisWeekLabel = format(
      startOfWeek(now, { weekStartsOn: 1 }),
      "MMM d",
    );
    const lastWeekLabel = format(
      startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      "MMM d",
    );

    const hoursThisWeek = Number(
      (weeklyTotals.get(thisWeekLabel) || 0).toFixed(2),
    );
    const hoursLastWeek = Number(
      (weeklyTotals.get(lastWeekLabel) || 0).toFixed(2),
    );
    const weeklyHourTrend = buildWeeklyTrend(weeklyTotals, 5, now);

    const todayKey = format(now, "yyyy-MM-dd");
    const todaysEntries = timeEntries.filter((entry) => {
      const entryDateKey = format(new Date(entry.timestamp), "yyyy-MM-dd");
      return entryDateKey === todayKey;
    });

    let openShiftCount = 0;
    for (const entry of todaysEntries) {
      if (entry.entry_type === "clock_in") {
        openShiftCount += 1;
      } else if (entry.entry_type === "clock_out") {
        openShiftCount = Math.max(openShiftCount - 1, 0);
      }
      // break events do not change the clock-in balance
    }

    const clockedInToday = openShiftCount > 0;

    const thirtyDaysAgo = subWeeks(now, 4);
    const totalEarnings30d = earnings
      .filter((payment) => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingEarnings = pending.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    const lastPayment = earnings
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

    const earningsTrend = calculateEarningsTrend(earnings, 30);

    const financialTips = deriveEmployeeTips({
      hoursThisWeek,
      hoursLastWeek,
      averageShiftLength: averageShift,
      totalEarnings30d,
      pendingEarnings,
    });

    return {
      hoursThisWeek,
      hoursLastWeek,
      averageShiftLength: Number(averageShift.toFixed(2)),
      clockedInToday,
      weeklyHourTrend,
      totalEarnings30d: Number(totalEarnings30d.toFixed(2)),
      pendingEarnings: Number(pendingEarnings.toFixed(2)),
      lastPaymentAmount: lastPayment ? Number(lastPayment.amount || 0) : null,
      lastPaymentDate: lastPayment ? lastPayment.created_at : null,
      earningsTrend,
      financialTips,
      loading: false,
    };
  }, [query.data, query.isLoading, user?.id]);
}

function summariseExpenses(expenses: Expense[]): ExpenseBreakdown[] {
  const breakdown = new Map<string, number>();

  expenses.forEach((expense) => {
    const label = expense.category ?? "other";
    breakdown.set(
      label,
      (breakdown.get(label) || 0) + Number(expense.amount || 0),
    );
  });

  return Array.from(breakdown.entries())
    .map(([label, total]) => ({
      label,
      total: Number(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);
}

function buildProfitLossTrend(params: {
  transactions: InventoryTransaction[];
  payments: Payment[];
  expenses: Expense[];
  wasteEvents: WasteEvent[];
  monthsBack: number;
}): MonthlyProfitLossPoint[] {
  const { transactions, payments, expenses, wasteEvents, monthsBack } = params;
  const now = new Date();
  const points: MonthlyProfitLossPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const label = format(monthStart, "MMM yyyy");

    const monthRevenue = transactions
      .filter((transaction) => {
        if (transaction.transaction_type !== "sale") return false;
        const createdAt = new Date(transaction.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      })
      .reduce(
        (sum, transaction) => sum + Number(transaction.total_amount || 0),
        0,
      );

    const monthPurchases = transactions
      .filter((transaction) => {
        if (transaction.transaction_type !== "purchase") return false;
        const createdAt = new Date(transaction.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      })
      .reduce(
        (sum, transaction) => sum + Number(transaction.total_amount || 0),
        0,
      );

    const monthPayroll = payments
      .filter((payment) => {
        if (!["wage", "bonus"].includes(payment.payment_type || ""))
          return false;
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const monthOperatingExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const monthWaste = wasteEvents
      .filter((event) => {
        const wasteDate = new Date(event.created_at);
        return wasteDate >= monthStart && wasteDate <= monthEnd;
      })
      .reduce((sum, event) => sum + Number(event.cost_impact || 0), 0);

    const profit =
      monthRevenue -
      (monthPayroll + monthOperatingExpenses + monthWaste + monthPurchases);

    points.push({
      monthLabel: label,
      revenue: Number(monthRevenue.toFixed(2)),
      payroll: Number(monthPayroll.toFixed(2)),
      operatingExpenses: Number(monthOperatingExpenses.toFixed(2)),
      wasteImpact: Number(monthWaste.toFixed(2)),
      inventoryPurchases: Number(monthPurchases.toFixed(2)),
      profit: Number(profit.toFixed(2)),
    });
  }

  return points;
}

function defaultIntegrations(): IntegrationStatus[] {
  return [
    {
      id: "toast",
      name: "Toast POS",
      description: "Sync hours worked and labor cost data directly from Toast.",
      status: "pending",
      lastSync: null,
      autoSync: true,
    },
    {
      id: "quickbooks",
      name: "QuickBooks Online",
      description:
        "Push payroll and expense records for accounting reconciliation.",
      status: "disconnected",
      lastSync: null,
      autoSync: false,
    },
    {
      id: "marketman",
      name: "MarketMan",
      description:
        "Import food cost, inventory, and waste adjustments automatically.",
      status: "pending",
      lastSync: null,
      autoSync: true,
    },
  ];
}

function createEmptySnapshot(loading: boolean): ManagerFinancialSnapshot {
  return {
    payrollTotal30d: 0,
    payrollPendingApproval: 0,
    payrollPendingApprovalCount: 0,
    payrollApproved: 0,
    laborCostThisWeek: 0,
    vendorSpending30d: 0,
    reimbursementVolume30d: 0,
    expenseBreakdown: [],
    operatingExpenses30d: 0,
    pendingExpenseTotal: 0,
    pendingExpenseCount: 0,
    pendingPaymentTotal: 0,
    pendingPaymentCount: 0,
    wasteCost30d: 0,
    inventoryPurchase30d: 0,
    inventorySales30d: 0,
    ownerFinancialOverview: createEmptyOwnerFinancialOverview(),
    profitLossTrend: [],
    profitForecastNextMonth: 0,
    integrations: defaultIntegrations(),
    loading,
  };
}

export function useManagerFinancialMetrics(): ManagerFinancialMetrics {
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["financial-management", "manager", companyId ?? "no-company"],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return {
          payments: [] as Payment[],
          expenses: [] as Expense[],
          transactions: [] as InventoryTransaction[],
          waste: [] as WasteEvent[],
          ownerOverview: null as OwnerFinancialOverviewRow | null,
        };
      }

      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6).toISOString();
      const thirtyDaysAgo = subWeeks(now, 4);
      const ownerStartDate = format(thirtyDaysAgo, "yyyy-MM-dd");
      const ownerEndDate = format(now, "yyyy-MM-dd");

      const [
        paymentsResponse,
        expensesResponse,
        transactionsResponse,
        wasteResponse,
        ownerOverviewResponse,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("expenses")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("inventory_transactions")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("inv_waste")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", sixMonthsAgo),
        fetchOwnerFinancialOverview({
          companyId,
          startDate: ownerStartDate,
          endDate: ownerEndDate,
        }),
      ]);

      if (paymentsResponse.error) throw paymentsResponse.error;
      if (expensesResponse.error) throw expensesResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;
      if (wasteResponse.error) throw wasteResponse.error;
      // The local fallback below keeps older preview databases usable while
      // the 05.09 migration is still being promoted.

      return {
        payments: (paymentsResponse.data as Payment[]) ?? [],
        expenses: (expensesResponse.data as Expense[]) ?? [],
        transactions:
          (transactionsResponse.data as InventoryTransaction[]) ?? [],
        waste: (wasteResponse.data as WasteEvent[]) ?? [],
        ownerOverview: ownerOverviewResponse.data,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (Phase 4 optimization)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const snapshot = useMemo<ManagerFinancialSnapshot>(() => {
    if (profileLoading || isLoading) {
      return createEmptySnapshot(true);
    }

    if (!companyId || !data) {
      return createEmptySnapshot(false);
    }

    const { payments, expenses, transactions, waste, ownerOverview } = data;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thirtyDaysAgo = subWeeks(now, 4);

    const payrollPayments = payments.filter((payment) =>
      ["wage", "bonus"].includes(payment.payment_type || ""),
    );
    const payrollTotal30d = payrollPayments
      .filter((payment) => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const payrollPendingApproval = payrollPayments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const payrollPendingApprovalCount = payrollPayments.filter(
      (payment) => payment.status === "pending",
    ).length;

    const payrollApproved = payrollPayments
      .filter((payment) => ["approved", "paid"].includes(payment.status || ""))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const laborCostThisWeek = payrollPayments
      .filter((payment) => new Date(payment.created_at) >= weekStart)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const vendorSpending30d = payments
      .filter((payment) => payment.payment_type === "vendor")
      .filter((payment) => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const reimbursementVolume30d = payments
      .filter((payment) => payment.payment_type === "expense_reimbursement")
      .filter((payment) => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingExpenses = expenses.filter(
      (expense) => expense.status === "pending",
    );
    const pendingExpenseTotal = pendingExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
    const pendingExpenseCount = pendingExpenses.length;

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending",
    );
    const pendingPaymentTotal = pendingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const pendingPaymentCount = pendingPayments.length;

    const recentExpenses = expenses.filter(
      (expense) => new Date(expense.created_at) >= thirtyDaysAgo,
    );
    const expenseBreakdown = summariseExpenses(recentExpenses);
    const operatingExpenses30d = recentExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    const wasteCost30d = waste
      .filter((event) => new Date(event.created_at) >= thirtyDaysAgo)
      .reduce((sum, event) => sum + Number(event.cost_impact || 0), 0);

    const inventoryPurchase30d = transactions
      .filter(
        (transaction) =>
          transaction.transaction_type === "purchase" &&
          new Date(transaction.created_at) >= thirtyDaysAgo,
      )
      .reduce(
        (sum, transaction) => sum + Number(transaction.total_amount || 0),
        0,
      );

    const inventorySales30d = transactions
      .filter(
        (transaction) =>
          transaction.transaction_type === "sale" &&
          new Date(transaction.created_at) >= thirtyDaysAgo,
      )
      .reduce(
        (sum, transaction) => sum + Number(transaction.total_amount || 0),
        0,
      );

    const profitLossTrend = buildProfitLossTrend({
      transactions,
      payments,
      expenses,
      wasteEvents: waste,
      monthsBack: 6,
    });

    const lastThreeMonths = profitLossTrend.slice(-3);
    const profitForecastNextMonth =
      lastThreeMonths.length > 0
        ? Number(
            (
              lastThreeMonths.reduce((sum, point) => sum + point.profit, 0) /
              lastThreeMonths.length
            ).toFixed(2),
          )
        : 0;

    const ownerFinancialOverview = mapOwnerFinancialOverview(ownerOverview);

    if (!ownerOverview) {
      ownerFinancialOverview.startDate = format(thirtyDaysAgo, "yyyy-MM-dd");
      ownerFinancialOverview.endDate = format(now, "yyyy-MM-dd");
      ownerFinancialOverview.actualRevenue = Number(inventorySales30d.toFixed(2));
      ownerFinancialOverview.actualExpenses = Number(
        operatingExpenses30d.toFixed(2),
      );
      ownerFinancialOverview.actualPayments = Number(
        (payrollApproved + vendorSpending30d + reimbursementVolume30d).toFixed(
          2,
        ),
      );
      ownerFinancialOverview.estimatedCost = Number(
        (laborCostThisWeek + inventoryPurchase30d + wasteCost30d).toFixed(2),
      );
      ownerFinancialOverview.estimatedLaborCost = Number(
        laborCostThisWeek.toFixed(2),
      );
      ownerFinancialOverview.estimatedWasteCost = Number(wasteCost30d.toFixed(2));
      ownerFinancialOverview.estimatedPurchasingCost = Number(
        inventoryPurchase30d.toFixed(2),
      );
      ownerFinancialOverview.pendingExpenseTotal = Number(
        pendingExpenseTotal.toFixed(2),
      );
      ownerFinancialOverview.pendingExpenseCount = pendingExpenseCount;
      ownerFinancialOverview.pendingPaymentTotal = Number(
        pendingPaymentTotal.toFixed(2),
      );
      ownerFinancialOverview.pendingPaymentCount = pendingPaymentCount;
      ownerFinancialOverview.pendingApprovalTotal = Number(
        (pendingExpenseTotal + pendingPaymentTotal).toFixed(2),
      );
      ownerFinancialOverview.pendingApprovalCount =
        pendingExpenseCount + pendingPaymentCount;
      ownerFinancialOverview.netOperatingPosition = Number(
        (
          inventorySales30d -
          operatingExpenses30d -
          payrollApproved -
          vendorSpending30d -
          reimbursementVolume30d -
          laborCostThisWeek -
          inventoryPurchase30d -
          wasteCost30d
        ).toFixed(2),
      );
      ownerFinancialOverview.sourceBreakdown = {
        actual: Number(
          (
            operatingExpenses30d +
            payrollApproved +
            vendorSpending30d +
            reimbursementVolume30d
          ).toFixed(2),
        ),
        imported: 0,
        estimated: ownerFinancialOverview.estimatedCost,
        revenue: ownerFinancialOverview.actualRevenue,
        pending: ownerFinancialOverview.pendingApprovalTotal,
      };
      ownerFinancialOverview.dataQualityFlags = {
        fallback: true,
        has_estimates: ownerFinancialOverview.estimatedCost > 0,
        pending_approvals: ownerFinancialOverview.pendingApprovalCount > 0,
      };
    }

    return {
      payrollTotal30d: Number(payrollTotal30d.toFixed(2)),
      payrollPendingApproval: Number(payrollPendingApproval.toFixed(2)),
      payrollPendingApprovalCount,
      payrollApproved: Number(payrollApproved.toFixed(2)),
      laborCostThisWeek: Number(laborCostThisWeek.toFixed(2)),
      vendorSpending30d: Number(vendorSpending30d.toFixed(2)),
      reimbursementVolume30d: Number(reimbursementVolume30d.toFixed(2)),
      expenseBreakdown,
      operatingExpenses30d: Number(operatingExpenses30d.toFixed(2)),
      pendingExpenseTotal: Number(pendingExpenseTotal.toFixed(2)),
      pendingExpenseCount,
      pendingPaymentTotal: Number(pendingPaymentTotal.toFixed(2)),
      pendingPaymentCount,
      wasteCost30d: Number(wasteCost30d.toFixed(2)),
      inventoryPurchase30d: Number(inventoryPurchase30d.toFixed(2)),
      inventorySales30d: Number(inventorySales30d.toFixed(2)),
      ownerFinancialOverview,
      profitLossTrend,
      profitForecastNextMonth,
      integrations: defaultIntegrations(),
      loading: false,
    } satisfies ManagerFinancialSnapshot;
  }, [companyId, data, isLoading, profileLoading]);

  const refresh = useCallback(async () => {
    if (!companyId) {
      return;
    }

    await refetch();
  }, [companyId, refetch]);

  return {
    ...snapshot,
    refresh,
    refreshing: isFetching,
  };
}
