import { addDays, differenceInCalendarDays, differenceInMinutes, isValid, subDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';
import type { ScenarioBaseline } from '@/lib/ai/scenarioEngine';

type ScheduleRow = Pick<Tables<'schedules'>, 'id' | 'company_id' | 'start_time' | 'end_time' | 'required_headcount' | 'is_published'>;
type AssignmentRow = Pick<Tables<'schedule_assignments'>, 'schedule_id'>;
type TaskRow = Pick<Tables<'tasks'>, 'id' | 'status' | 'due_date' | 'created_at' | 'completed_at' | 'created_by' | 'assigned_to'>;
type GoalRow = Pick<Tables<'goals'>, 'id' | 'status' | 'progress' | 'company_id' | 'target_date' | 'created_at'>;
type InventoryTransactionRow = Pick<Tables<'inventory_transactions'>, 'transaction_type' | 'total_amount' | 'created_at' | 'performed_by'>;
type ExpenseRow = Pick<Tables<'expenses'>, 'amount' | 'status' | 'expense_date' | 'created_by'>;
type ProfileRow = Pick<Tables<'profiles'>, 'id'>;

const ACTIVE_TASK_STATUSES = new Set(['todo', 'in_progress', 'review']);
const DEFAULT_HORIZON_DAYS = 21;
const TARGET_REVENUE_PER_LABOR_HOUR = 135;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const detailedCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value));
const formatDetailedCurrency = (value: number) => detailedCurrencyFormatter.format(value);

export interface OperationalMetrics {
  generatedAt: string;
  memberCount: number;
  scheduling: {
    coverageRate: number;
    totalShifts: number;
    openShifts: number;
    averageShiftHours: number;
    overtimeRisk: number;
    plannedLaborHours: number;
    actualLaborHours: number;
  };
  tasks: {
    backlog: number;
    overdue: number;
    avgAgeDays: number;
    completedLast30: number;
    createdLast30: number;
  };
  goals: {
    total: number;
    active: number;
    avgProgress: number;
    atRisk: number;
    velocityPerWeek: number;
  };
  revenue: {
    trailing30: number;
    forecastNext30: number;
    operatingCost30: number;
    marginRate: number;
  };
}

export interface OperationalMetricsResult {
  metrics: OperationalMetrics;
  isFallback: boolean;
  message?: string;
}

export interface BusinessAnalyticsPrediction {
  title: string;
  description: string;
  value: string;
  confidence: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface BusinessAnalyticsSnapshot {
  generatedAt: string;
  baseline: ScenarioBaseline;
  metrics: {
    goalVelocity: number;
    laborEfficiencyIndex: number;
    revenuePerLaborHour: number;
    forecastConfidence: number;
    marginRate: number;
    scheduleCoverage: number;
    taskThroughputRatio: number;
  };
  breakdown: {
    scheduling: OperationalMetrics['scheduling'];
    tasks: OperationalMetrics['tasks'];
    goals: OperationalMetrics['goals'];
    revenue: OperationalMetrics['revenue'];
  };
  summary: {
    headline: string;
    focusAreas: string[];
    positiveSignals: string[];
  };
  predictions: BusinessAnalyticsPrediction[];
}

export interface BusinessAnalyticsSnapshotResult {
  snapshot: BusinessAnalyticsSnapshot;
  isFallback: boolean;
  notice?: string;
}

export interface FetchOperationalMetricsParams {
  companyId?: string | null;
  horizonDays?: number;
  now?: Date;
  supabaseClient?: SupabaseClient;
}

function createFallbackMetrics(now = new Date()): OperationalMetrics {
  return {
    generatedAt: now.toISOString(),
    memberCount: 18,
    scheduling: {
      coverageRate: 0.88,
      totalShifts: 132,
      openShifts: 16,
      averageShiftHours: 6.4,
      overtimeRisk: 0.24,
      plannedLaborHours: 780,
      actualLaborHours: 752,
    },
    tasks: {
      backlog: 44,
      overdue: 8,
      avgAgeDays: 5.2,
      completedLast30: 120,
      createdLast30: 138,
    },
    goals: {
      total: 12,
      active: 9,
      avgProgress: 67,
      atRisk: 3,
      velocityPerWeek: 11.4,
    },
    revenue: {
      trailing30: 128_500,
      forecastNext30: 134_750,
      operatingCost30: 95_200,
      marginRate: 0.257,
    },
  };
}

function buildScenarioBaseline(metrics: OperationalMetrics): ScenarioBaseline {
  return {
    generatedAt: metrics.generatedAt,
    scheduling: {
      coverageRate: Number(metrics.scheduling.coverageRate.toFixed(4)),
      totalShifts: metrics.scheduling.totalShifts,
      openShifts: metrics.scheduling.openShifts,
      averageShiftHours: Number(metrics.scheduling.averageShiftHours.toFixed(2)),
      overtimeRisk: Number(metrics.scheduling.overtimeRisk.toFixed(3)),
    },
    tasks: {
      backlog: metrics.tasks.backlog,
      overdue: metrics.tasks.overdue,
      avgAgeDays: Number(metrics.tasks.avgAgeDays.toFixed(2)),
    },
    goals: {
      total: metrics.goals.total,
      active: metrics.goals.active,
      avgProgress: Number(metrics.goals.avgProgress.toFixed(1)),
      atRisk: metrics.goals.atRisk,
    },
    revenue: {
      trailing30: Number(metrics.revenue.trailing30.toFixed(2)),
      forecastNext30: Number(metrics.revenue.forecastNext30.toFixed(2)),
      operatingCost30: Number(metrics.revenue.operatingCost30.toFixed(2)),
      marginRate: Number(metrics.revenue.marginRate.toFixed(3)),
    },
  };
}

function computeGoalVelocity(goals: GoalRow[], reference: Date): number {
  const activeGoals = goals.filter((goal) => (goal.status ?? '').toLowerCase() === 'active');
  if (!activeGoals.length) return 0;

  const velocities = activeGoals.map((goal) => {
    const createdAt = goal.created_at ? new Date(goal.created_at) : subDays(reference, 45);
    const validCreated = isValid(createdAt) ? createdAt : subDays(reference, 45);
    const daysActive = Math.max(1, differenceInCalendarDays(reference, validCreated));
    const progress = toNumber(goal.progress, 0);
    return (progress / daysActive) * 7; // percent progress per week
  });

  const total = velocities.reduce((sum, velocity) => sum + velocity, 0);
  return Number((total / velocities.length).toFixed(1));
}

function computeTaskMetrics(taskData: TaskRow[], reference: Date) {
  const nowTime = reference.getTime();
  const last30 = subDays(reference, 30);

  let backlog = 0;
  let overdue = 0;
  let totalAge = 0;
  let completedLast30 = 0;
  let createdLast30 = 0;

  taskData.forEach((task) => {
    const status = (task.status ?? '').toLowerCase();
    const createdAt = task.created_at ? new Date(task.created_at) : null;
    if (createdAt && isValid(createdAt) && createdAt >= last30) {
      createdLast30 += 1;
    }
    if (status === 'completed') {
      const completedAt = task.completed_at ? new Date(task.completed_at) : null;
      if (completedAt && isValid(completedAt) && completedAt >= last30) {
        completedLast30 += 1;
      }
    }
    if (ACTIVE_TASK_STATUSES.has(status)) {
      backlog += 1;
      if (task.due_date) {
        const due = new Date(task.due_date);
        if (isValid(due) && due.getTime() < nowTime) {
          overdue += 1;
        }
      }
    }
    if (task.created_at) {
      const created = new Date(task.created_at);
      if (isValid(created)) {
        const ageDays = (nowTime - created.getTime()) / (1000 * 60 * 60 * 24);
        totalAge += Math.max(0, ageDays);
      }
    }
  });

  const avgAgeDays = taskData.length > 0 ? totalAge / taskData.length : 0;

  return {
    backlog,
    overdue,
    avgAgeDays: Number(avgAgeDays.toFixed(2)),
    completedLast30,
    createdLast30,
  };
}

function computeSchedulingMetrics(scheduleData: ScheduleRow[], assignments: AssignmentRow[]) {
  const scheduleIds = new Set(scheduleData.map((row) => row.id));
  const assignmentsBySchedule = new Map<string, number>();

  assignments.forEach((assignment) => {
    if (!assignment.schedule_id || !scheduleIds.has(assignment.schedule_id)) return;
    assignmentsBySchedule.set(
      assignment.schedule_id,
      (assignmentsBySchedule.get(assignment.schedule_id) ?? 0) + 1,
    );
  });

  const totalRequired = scheduleData.reduce(
    (acc, row) => acc + (typeof row.required_headcount === 'number' ? row.required_headcount : 1),
    0,
  );
  const totalAssigned = assignments.length;

  let totalShiftMinutes = 0;
  let plannedLaborHours = 0;
  let actualLaborHours = 0;

  scheduleData.forEach((row) => {
    if (!row.start_time || !row.end_time) return;
    const start = new Date(row.start_time);
    const end = new Date(row.end_time);
    if (!isValid(start) || !isValid(end)) return;
    const durationMinutes = Math.max(0, differenceInMinutes(end, start));
    totalShiftMinutes += durationMinutes;

    const requiredHeadcount = typeof row.required_headcount === 'number' ? row.required_headcount : 1;
    const assignedCount = assignmentsBySchedule.get(row.id) ?? 0;
    plannedLaborHours += (durationMinutes / 60) * requiredHeadcount;
    actualLaborHours += (durationMinutes / 60) * (assignedCount > 0 ? assignedCount : requiredHeadcount);
  });

  const coverageRate = totalRequired > 0 ? totalAssigned / totalRequired : 1;
  const openShifts = Math.max(0, totalRequired - totalAssigned);
  const overtimeRisk = totalRequired > 0 ? openShifts / totalRequired : 0;
  const averageShiftHours = scheduleData.length > 0 ? totalShiftMinutes / scheduleData.length / 60 : 0;

  return {
    coverageRate: Number(coverageRate.toFixed(4)),
    totalShifts: scheduleData.length,
    openShifts,
    averageShiftHours: Number(averageShiftHours.toFixed(2)),
    overtimeRisk: Number(overtimeRisk.toFixed(3)),
    plannedLaborHours: Number(plannedLaborHours.toFixed(1)),
    actualLaborHours: Number(actualLaborHours.toFixed(1)),
  };
}

export async function fetchOperationalMetrics(params: FetchOperationalMetricsParams): Promise<OperationalMetricsResult> {
  const { companyId, horizonDays = DEFAULT_HORIZON_DAYS, now = new Date(), supabaseClient } = params;
  const client = supabaseClient ?? supabase;

  if (!companyId) {
    return {
      metrics: createFallbackMetrics(now),
      isFallback: true,
      message: 'Select or create a company to load live data.',
    };
  }

  try {
    const scheduleStart = subDays(now, 7).toISOString();
    const scheduleEnd = addDays(now, horizonDays).toISOString();
    const financialStart = subDays(now, 30);

    // Phase 4: RPC endpoint optimization will be added in future iteration
    // For now, keeping legacy queries but they're optimized with indexes

    // Legacy method: Multiple sequential queries (fallback)
    const { data: memberRows, error: membersError } = await client
      .from('profiles')
      .select('id')
      .eq('company_id', companyId);

    if (membersError) throw membersError;

    const memberIds = (memberRows ?? []).map((row: ProfileRow) => row.id);

    if (memberIds.length === 0) {
      return {
        metrics: createFallbackMetrics(now),
        isFallback: true,
        message: 'No team members found for this company. Using simulator defaults.',
      };
    }

    const { data: scheduleRows, error: schedulesError } = await client
      .from('schedules')
      .select('id, company_id, start_time, end_time, required_headcount, is_published')
      .eq('company_id', companyId)
      .gte('start_time', scheduleStart)
      .lt('start_time', scheduleEnd)
      .order('start_time', { ascending: true })
      .limit(400);

    if (schedulesError) throw schedulesError;

    const scheduleData = (scheduleRows ?? []) as ScheduleRow[];
    const scheduleIds = scheduleData.map((row) => row.id);
    let assignmentRows: AssignmentRow[] = [];

    if (scheduleIds.length > 0) {
      const { data: assignmentsData, error: assignmentsError } = await client
        .from('schedule_assignments')
        .select('schedule_id')
        .in('schedule_id', scheduleIds);

      if (assignmentsError) throw assignmentsError;
      assignmentRows = (assignmentsData ?? []) as AssignmentRow[];
    }

    // Filter tasks by company_id directly for security, with fallback to memberIds
    const tasksPromise = client
      .from('tasks')
      .select('id, status, due_date, created_at, completed_at, created_by, assigned_to, company_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(600);

    const goalsPromise = client
      .from('goals')
      .select('id, status, progress, target_date, created_at, company_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Filter inventory transactions by memberIds (table doesn't have company_id column)
    // Security: memberIds are already filtered by company_id, ensuring tenant isolation
    const transactionsPromise = client
      .from('inventory_transactions')
      .select('transaction_type, total_amount, created_at, performed_by')
      .in('performed_by', memberIds)
      .gte('created_at', financialStart.toISOString())
      .limit(600);

    // Filter expenses by memberIds (table doesn't have company_id column)
    // Security: memberIds are already filtered by company_id, ensuring tenant isolation
    const expensesPromise = client
      .from('expenses')
      .select('amount, status, expense_date, created_by')
      .in('created_by', memberIds)
      .gte('expense_date', financialStart.toISOString().split('T')[0])
      .limit(600);

    const [tasksResult, goalsResult, transactionsResult, expensesResult] = await Promise.all([
      tasksPromise,
      goalsPromise,
      transactionsPromise,
      expensesPromise,
    ]);

    if (tasksResult.error) throw tasksResult.error;
    if (goalsResult.error) throw goalsResult.error;
    if (transactionsResult.error) throw transactionsResult.error;
    if (expensesResult.error) throw expensesResult.error;

    const taskMetrics = computeTaskMetrics((tasksResult.data ?? []) as TaskRow[], now);
    const schedulingMetrics = computeSchedulingMetrics(scheduleData, assignmentRows);

    const goalsData = (goalsResult.data ?? []) as GoalRow[];
    const goalVelocity = computeGoalVelocity(goalsData, now);
    const totalGoals = goalsData.length;
    const activeGoals = goalsData.filter((goal) => (goal.status ?? '').toLowerCase() === 'active').length;
    const avgProgress =
      totalGoals > 0
        ? goalsData.reduce((acc, goal) => acc + toNumber(goal.progress, 0), 0) / totalGoals
        : 0;
    const atRiskGoals = goalsData.filter((goal) => toNumber(goal.progress, 0) < 60).length;

    const transactionData = (transactionsResult.data ?? []) as InventoryTransactionRow[];
    const expenseData = (expensesResult.data ?? []) as ExpenseRow[];
    const salesTransactions = transactionData.filter((row) => row.transaction_type === 'sale');
    const trailingRevenue = salesTransactions.reduce(
      (acc, row) => acc + toNumber(row.total_amount, 0),
      0,
    );

    const paidExpenses = expenseData.filter((row) =>
      ['approved', 'paid'].includes((row.status ?? '').toLowerCase()),
    );
    const operatingCost30 = paidExpenses.reduce((acc, row) => acc + toNumber(row.amount, 0), 0);

    const forecastNext30 = trailingRevenue * 1.05;
    const marginRate =
      trailingRevenue > 0
        ? Math.max(0, (trailingRevenue - operatingCost30) / trailingRevenue)
        : 0.25;

    const metrics: OperationalMetrics = {
      generatedAt: now.toISOString(),
      memberCount: memberIds.length,
      scheduling: schedulingMetrics,
      tasks: taskMetrics,
      goals: {
        total: totalGoals,
        active: activeGoals,
        avgProgress: Number(avgProgress.toFixed(1)),
        atRisk: atRiskGoals,
        velocityPerWeek: goalVelocity,
      },
      revenue: {
        trailing30: Number(trailingRevenue.toFixed(2)),
        forecastNext30: Number(forecastNext30.toFixed(2)),
        operatingCost30: Number(operatingCost30.toFixed(2)),
        marginRate: Number(marginRate.toFixed(3)),
      },
    };

    return { metrics, isFallback: false };
  } catch (error) {
    logger.error('Business analytics metrics error', { error, tags: ['error'] });
    return {
      metrics: createFallbackMetrics(now),
      isFallback: true,
      message: 'Unable to load live analytics. Showing simulator defaults.',
    };
  }
}

function buildForecastConfidence(metrics: OperationalMetrics): number {
  const coverageScore = metrics.scheduling.coverageRate * 100;
  const marginScore = metrics.revenue.marginRate * 100;
  const goalScore = metrics.goals.avgProgress;
  const backlogPenalty = Math.min(
    35,
    metrics.tasks.backlog * 0.9 + metrics.tasks.overdue * 2.5,
  );
  const overtimePenalty = metrics.scheduling.overtimeRisk * 45;
  const rawConfidence =
    34 + coverageScore * 0.22 + marginScore * 0.35 + goalScore * 0.2 - backlogPenalty - overtimePenalty;
  return Number(clamp(rawConfidence, 18, 96).toFixed(0));
}

function buildSummary(metrics: OperationalMetrics, snapshotMetrics: BusinessAnalyticsSnapshot['metrics']) {
  const headline = `Forecast confidence ${snapshotMetrics.forecastConfidence}% with ${formatCurrency(metrics.revenue.forecastNext30)} projected revenue and ${Math.round(metrics.revenue.marginRate * 100)}% margin.`;

  const focusAreas: string[] = [];
  if (metrics.tasks.overdue > Math.max(6, metrics.tasks.backlog * 0.35)) {
    focusAreas.push(`Task backlog pressure: ${metrics.tasks.overdue} overdue items require intervention.`);
  }
  if (metrics.scheduling.overtimeRisk > 0.25) {
    focusAreas.push(`Overtime risk elevated at ${(metrics.scheduling.overtimeRisk * 100).toFixed(0)}% due to ${metrics.scheduling.openShifts} open shifts.`);
  }
  if (snapshotMetrics.laborEfficiencyIndex < 90) {
    focusAreas.push(
      `Revenue per labor hour at ${formatDetailedCurrency(snapshotMetrics.revenuePerLaborHour)} is below the ${TARGET_REVENUE_PER_LABOR_HOUR} target.`,
    );
  }
  if (!focusAreas.length) {
    focusAreas.push('Operational metrics look stable. Maintain monitoring cadence and capture incremental improvements.');
  }

  const positiveSignals: string[] = [];
  if (snapshotMetrics.goalVelocity >= 10) {
    positiveSignals.push(`Goal execution momentum tracking at ${snapshotMetrics.goalVelocity.toFixed(1)} pts/week across ${metrics.goals.active} active goals.`);
  }
  if (snapshotMetrics.forecastConfidence >= 70) {
    positiveSignals.push('Financial outlook remains strong with healthy margin resilience.');
  }
  if (metrics.scheduling.coverageRate >= 0.93) {
    positiveSignals.push('Shift coverage is sustaining above 93%, reducing service disruption risk.');
  }

  return { headline, focusAreas, positiveSignals };
}

function buildPredictions(snapshotMetrics: BusinessAnalyticsSnapshot['metrics'], metrics: OperationalMetrics): BusinessAnalyticsPrediction[] {
  const backlogRatio = snapshotMetrics.taskThroughputRatio;
  const backlogTrend = backlogRatio >= 1 ? 'absorbing intake' : 'backlog growth risk';
  const throughputConfidence = clamp(Math.round(backlogRatio * 90), 25, 92);

  return [
    {
      title: 'Revenue Outlook',
      description: `Projected revenue of ${formatCurrency(metrics.revenue.forecastNext30)} with margin holding at ${Math.round(metrics.revenue.marginRate * 100)}%.`,
      value: formatCurrency(metrics.revenue.forecastNext30),
      confidence: snapshotMetrics.forecastConfidence,
      impact: snapshotMetrics.forecastConfidence >= 70 ? 'positive' : snapshotMetrics.forecastConfidence >= 55 ? 'neutral' : 'negative',
    },
    {
      title: 'Goal Completion Trajectory',
      description: `Average goal progress at ${metrics.goals.avgProgress}% with velocity ${snapshotMetrics.goalVelocity.toFixed(1)} pts/week.`,
      value: `${metrics.goals.avgProgress.toFixed(0)}%`,
      confidence: clamp(Math.round(metrics.goals.avgProgress + snapshotMetrics.goalVelocity), 35, 95),
      impact: snapshotMetrics.goalVelocity >= 9 ? 'positive' : 'neutral',
    },
    {
      title: 'Labor Efficiency',
      description: `Revenue per labor hour tracking ${formatDetailedCurrency(snapshotMetrics.revenuePerLaborHour)} (${snapshotMetrics.laborEfficiencyIndex.toFixed(0)} index vs target ${TARGET_REVENUE_PER_LABOR_HOUR}).`,
      value: `${snapshotMetrics.laborEfficiencyIndex.toFixed(0)} index`,
      confidence: clamp(Math.round(snapshotMetrics.laborEfficiencyIndex), 40, 95),
      impact: snapshotMetrics.laborEfficiencyIndex >= 90 ? 'neutral' : 'negative',
    },
    {
      title: 'Task Throughput',
      description: `Team is ${backlogRatio >= 1 ? 'keeping pace with' : 'lagging'} intake (${(snapshotMetrics.taskThroughputRatio * 100).toFixed(0)}% completion/capture ratio, ${backlogTrend}).`,
      value: `${(snapshotMetrics.taskThroughputRatio * 100).toFixed(0)}%`,
      confidence: throughputConfidence,
      impact: backlogRatio >= 1 ? 'positive' : 'negative',
    },
  ];
}

function buildBusinessSnapshotFromMetrics(metrics: OperationalMetrics): BusinessAnalyticsSnapshot {
  const baseline = buildScenarioBaseline(metrics);
  const laborHours = metrics.scheduling.actualLaborHours || metrics.scheduling.plannedLaborHours;
  const revenuePerLaborHour = laborHours > 0 ? metrics.revenue.trailing30 / laborHours : 0;
  const laborEfficiencyIndex = Number(
    clamp((revenuePerLaborHour / TARGET_REVENUE_PER_LABOR_HOUR) * 100, 45, 155).toFixed(0),
  );
  const forecastConfidence = buildForecastConfidence(metrics);
  const taskThroughputRatio =
    metrics.tasks.createdLast30 > 0
      ? Number((metrics.tasks.completedLast30 / metrics.tasks.createdLast30).toFixed(2))
      : metrics.tasks.completedLast30 > 0
        ? 1.05
        : 0.82;

  const snapshotMetrics = {
    goalVelocity: metrics.goals.velocityPerWeek,
    laborEfficiencyIndex,
    revenuePerLaborHour: Number(revenuePerLaborHour.toFixed(2)),
    forecastConfidence,
    marginRate: metrics.revenue.marginRate,
    scheduleCoverage: metrics.scheduling.coverageRate,
    taskThroughputRatio,
  };

  const summary = buildSummary(metrics, snapshotMetrics);
  const predictions = buildPredictions(snapshotMetrics, metrics);

  return {
    generatedAt: metrics.generatedAt,
    baseline,
    metrics: snapshotMetrics,
    breakdown: {
      scheduling: metrics.scheduling,
      tasks: metrics.tasks,
      goals: metrics.goals,
      revenue: metrics.revenue,
    },
    summary,
    predictions,
  };
}

export async function fetchBusinessAnalyticsSnapshot(
  params: FetchOperationalMetricsParams,
): Promise<BusinessAnalyticsSnapshotResult> {
  const result = await fetchOperationalMetrics(params);
  const snapshot = buildBusinessSnapshotFromMetrics(result.metrics);
  return {
    snapshot,
    isFallback: result.isFallback,
    notice: result.message,
  };
}

export function getFallbackBusinessSnapshot(now?: Date): BusinessAnalyticsSnapshot {
  const metrics = createFallbackMetrics(now);
  return buildBusinessSnapshotFromMetrics(metrics);
}
