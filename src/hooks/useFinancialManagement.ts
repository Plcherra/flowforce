import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/public-types';
import { endOfMonth, format, isAfter, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';

type TimeEntry = Tables<'time_entries'>;
type Payment = Tables<'payments'>;
type Expense = Tables<'expenses'>;
type InventoryTransaction = Tables<'inventory_transactions'>;
type WasteEvent = Tables<'inv_waste'>;

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
  id: 'toast' | 'quickbooks' | 'marketman';
  name: string;
  description: string;
  status: 'connected' | 'pending' | 'disconnected';
  lastSync: string | null;
  autoSync: boolean;
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
  wasteCost30d: number;
  inventoryPurchase30d: number;
  inventorySales30d: number;
  profitLossTrend: MonthlyProfitLossPoint[];
  profitForecastNextMonth: number;
  integrations: IntegrationStatus[];
  loading: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
};

type ManagerFinancialSnapshot = Omit<ManagerFinancialMetrics, 'refresh' | 'refreshing'>;

const HOURS_IN_MILLISECOND = 1000 * 60 * 60;

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
      case 'clock_in':
        currentClockIn = entryDate;
        breakDurationMs = 0;
        activeBreakStart = null;
        break;
      case 'break_start':
        if (currentClockIn) {
          activeBreakStart = entryDate;
        }
        break;
      case 'break_end':
        if (currentClockIn && activeBreakStart) {
          breakDurationMs += entryDate.getTime() - activeBreakStart.getTime();
          activeBreakStart = null;
        }
        break;
      case 'clock_out':
        if (currentClockIn) {
          const rawDurationMs = entryDate.getTime() - currentClockIn.getTime();
          const netDurationMs = Math.max(rawDurationMs - breakDurationMs, 0);
          const hours = netDurationMs / HOURS_IN_MILLISECOND;

          totalHours += hours;
          shiftCount += 1;

          const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
          const weekLabel = format(weekStart, 'MMM d');
          weeklyTotals.set(weekLabel, (weeklyTotals.get(weekLabel) || 0) + hours);

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
    const weekStart = startOfWeek(subWeeks(referenceDate, i), { weekStartsOn: 1 });
    const label = format(weekStart, 'MMM d');
    trend.push({
      weekLabel: label,
      hours: Number((weeklyTotals.get(label) || 0).toFixed(2)),
    });
  }

  return trend;
}

function calculateEarningsTrend(payments: Payment[], daysBack: number): EarningsTrendPoint[] {
  const today = new Date();
  const start = subWeeks(today, Math.ceil(daysBack / 7));
  const filtered = payments.filter(payment => new Date(payment.created_at) >= start);

  const byDate = new Map<string, number>();
  filtered.forEach(payment => {
    const date = format(new Date(payment.created_at), 'yyyy-MM-dd');
    byDate.set(date, (byDate.get(date) || 0) + Number(payment.amount || 0));
  });

  const result: EarningsTrendPoint[] = [];
  let cursor = startOfWeek(start, { weekStartsOn: 1 });
  const end = new Date(today);

  while (!isAfter(cursor, end)) {
    const dateKey = format(cursor, 'yyyy-MM-dd');
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

  if (metrics.hoursThisWeek < metrics.hoursLastWeek && metrics.hoursLastWeek > 0) {
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
    tips.push('Great work! Your hours and payouts look stable this month.');
  }

  return tips;
}

export function useEmployeeFinancialMetrics(): EmployeeFinancialMetrics {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['financial-management', 'employee', user?.id],
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

      const [timeEntriesResponse, earningsResponse, pendingResponse] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('timestamp', fourWeeksAgo)
          .order('timestamp', { ascending: true }),
        supabase
          .from('payments')
          .select('*')
          .eq('recipient_id', user.id)
          .in('status', ['approved', 'paid'])
          .in('payment_type', ['wage', 'bonus', 'expense_reimbursement']),
        supabase
          .from('payments')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('status', 'pending')
          .in('payment_type', ['wage', 'bonus', 'expense_reimbursement']),
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
    const thisWeekLabel = format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d');
    const lastWeekLabel = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'MMM d');

    const hoursThisWeek = Number((weeklyTotals.get(thisWeekLabel) || 0).toFixed(2));
    const hoursLastWeek = Number((weeklyTotals.get(lastWeekLabel) || 0).toFixed(2));
    const weeklyHourTrend = buildWeeklyTrend(weeklyTotals, 5, now);

    const lastClockEntry = timeEntries.length > 0 ? timeEntries[timeEntries.length - 1] : null;
    const clockedInToday =
      lastClockEntry?.entry_type === 'clock_in' &&
      format(new Date(lastClockEntry.timestamp), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

    const thirtyDaysAgo = subWeeks(now, 4);
    const totalEarnings30d = earnings
      .filter(payment => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingEarnings = pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const lastPayment = earnings
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

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

  expenses.forEach(expense => {
    const label = expense.category ?? 'other';
    breakdown.set(label, (breakdown.get(label) || 0) + Number(expense.amount || 0));
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

    const label = format(monthStart, 'MMM yyyy');

    const monthRevenue = transactions
      .filter(transaction => {
        if (transaction.transaction_type !== 'sale') return false;
        const createdAt = new Date(transaction.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      })
      .reduce((sum, transaction) => sum + Number(transaction.total_amount || 0), 0);

    const monthPurchases = transactions
      .filter(transaction => {
        if (transaction.transaction_type !== 'purchase') return false;
        const createdAt = new Date(transaction.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      })
      .reduce((sum, transaction) => sum + Number(transaction.total_amount || 0), 0);

    const monthPayroll = payments
      .filter(payment => {
        if (!['wage', 'bonus'].includes(payment.payment_type || '')) return false;
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const monthOperatingExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const monthWaste = wasteEvents
      .filter(event => {
        const wasteDate = new Date(event.created_at);
        return wasteDate >= monthStart && wasteDate <= monthEnd;
      })
      .reduce((sum, event) => sum + Number(event.cost_impact || 0), 0);

    const profit =
      monthRevenue - (monthPayroll + monthOperatingExpenses + monthWaste + monthPurchases);

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
      id: 'toast',
      name: 'Toast POS',
      description: 'Sync hours worked and labor cost data directly from Toast.',
      status: 'pending',
      lastSync: null,
      autoSync: true,
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks Online',
      description: 'Push payroll and expense records for accounting reconciliation.',
      status: 'disconnected',
      lastSync: null,
      autoSync: false,
    },
    {
      id: 'marketman',
      name: 'MarketMan',
      description: 'Import food cost, inventory, and waste adjustments automatically.',
      status: 'pending',
      lastSync: null,
      autoSync: true,
    },
  ];
}

export function useManagerFinancialMetrics(): ManagerFinancialMetrics {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['financial-management', 'manager'],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      const [paymentsResponse, expensesResponse, transactionsResponse, wasteResponse] =
        await Promise.all([
          supabase
            .from('payments')
            .select('*')
            .gte('created_at', sixMonthsAgo),
          supabase
            .from('expenses')
            .select('*')
            .gte('created_at', sixMonthsAgo),
          supabase
            .from('inventory_transactions')
            .select('*')
            .gte('created_at', sixMonthsAgo),
          supabase
            .from('inv_waste')
            .select('*')
            .gte('created_at', sixMonthsAgo),
        ]);

      if (paymentsResponse.error) throw paymentsResponse.error;
      if (expensesResponse.error) throw expensesResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;
      if (wasteResponse.error) throw wasteResponse.error;

      return {
        payments: (paymentsResponse.data as Payment[]) ?? [],
        expenses: (expensesResponse.data as Expense[]) ?? [],
        transactions: (transactionsResponse.data as InventoryTransaction[]) ?? [],
        waste: (wasteResponse.data as WasteEvent[]) ?? [],
      };
    },
  });

  const snapshot = useMemo<ManagerFinancialSnapshot>(() => {
    if (isLoading) {
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
        wasteCost30d: 0,
        inventoryPurchase30d: 0,
        inventorySales30d: 0,
        profitLossTrend: [],
        profitForecastNextMonth: 0,
        integrations: defaultIntegrations(),
        loading: true,
      } satisfies ManagerFinancialSnapshot;
    }

    const { payments, expenses, transactions, waste } = data ?? {
      payments: [],
      expenses: [],
      transactions: [],
      waste: [],
    };

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thirtyDaysAgo = subWeeks(now, 4);

    const payrollPayments = payments.filter(payment =>
      ['wage', 'bonus'].includes(payment.payment_type || ''),
    );
    const payrollTotal30d = payrollPayments
      .filter(payment => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const payrollPendingApproval = payrollPayments
      .filter(payment => payment.status === 'pending')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const payrollPendingApprovalCount = payrollPayments.filter(
      payment => payment.status === 'pending',
    ).length;

    const payrollApproved = payrollPayments
      .filter(payment => ['approved', 'paid'].includes(payment.status || ''))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const laborCostThisWeek = payrollPayments
      .filter(payment => new Date(payment.created_at) >= weekStart)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const vendorSpending30d = payments
      .filter(payment => payment.payment_type === 'vendor')
      .filter(payment => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const reimbursementVolume30d = payments
      .filter(payment => payment.payment_type === 'expense_reimbursement')
      .filter(payment => new Date(payment.created_at) >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
    const pendingExpenseTotal = pendingExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
    const pendingExpenseCount = pendingExpenses.length;

    const recentExpenses = expenses.filter(
      expense => new Date(expense.created_at) >= thirtyDaysAgo,
    );
    const expenseBreakdown = summariseExpenses(recentExpenses);
    const operatingExpenses30d = recentExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    const wasteCost30d = waste
      .filter(event => new Date(event.created_at) >= thirtyDaysAgo)
      .reduce((sum, event) => sum + Number(event.cost_impact || 0), 0);

    const inventoryPurchase30d = transactions
      .filter(
        transaction =>
          transaction.transaction_type === 'purchase' &&
          new Date(transaction.created_at) >= thirtyDaysAgo,
      )
      .reduce((sum, transaction) => sum + Number(transaction.total_amount || 0), 0);

    const inventorySales30d = transactions
      .filter(
        transaction =>
          transaction.transaction_type === 'sale' &&
          new Date(transaction.created_at) >= thirtyDaysAgo,
      )
      .reduce((sum, transaction) => sum + Number(transaction.total_amount || 0), 0);

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
      wasteCost30d: Number(wasteCost30d.toFixed(2)),
      inventoryPurchase30d: Number(inventoryPurchase30d.toFixed(2)),
      inventorySales30d: Number(inventorySales30d.toFixed(2)),
      profitLossTrend,
      profitForecastNextMonth,
      integrations: defaultIntegrations(),
      loading: false,
    } satisfies ManagerFinancialSnapshot;
  }, [data, isLoading]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    ...snapshot,
    refresh,
    refreshing: isFetching,
  };
}
