#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RANGE_DAYS = Number.parseInt(process.env.KPI_RANGE_DAYS ?? '14', 10);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('seedKpiInsights: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const now = new Date();
const currentStart = shiftDays(now, -RANGE_DAYS);
const previousStart = shiftDays(currentStart, -RANGE_DAYS);
const previousEnd = currentStart;

try {
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  if (companyError) {
    throw companyError;
  }

  if (!companies?.length) {
    console.info('[seedKpiInsights] No companies found – nothing to seed.');
    process.exit(0);
  }

  let totalInserted = 0;

  for (const company of companies) {
    try {
      const [currentSnapshot, previousSnapshot] = await Promise.all([
        buildSnapshot(company.id, currentStart, now),
        buildSnapshot(company.id, previousStart, previousEnd),
      ]);

      const metrics = buildMetrics(currentSnapshot, previousSnapshot, now);
      if (!metrics.length) {
        console.info(`[seedKpiInsights] ${company.name}: no metrics available in the selected window.`);
        continue;
      }

      const { error: insertError } = await supabase.from('kpi_insights').insert(
        metrics.map((metric) => ({
          company_id: company.id,
          metric: metric.id,
          label: metric.label,
          value: metric.value,
          delta: metric.delta,
          trend: metric.trend,
          unit: metric.unit,
          metadata: metric.metadata,
          recorded_at: metric.recordedAt,
        })),
      );

      if (insertError) {
        throw insertError;
      }

      totalInserted += metrics.length;
      console.info(
        `[seedKpiInsights] ${company.name}: inserted ${metrics.length} KPI rows (window ${RANGE_DAYS} days).`,
      );
    } catch (companyRunError) {
      console.error(
        `[seedKpiInsights] Failed to build metrics for company ${company.name}:`,
        companyRunError.message ?? companyRunError,
      );
    }
  }

  console.info(`[seedKpiInsights] Completed. Inserted ${totalInserted} KPI rows.`);
  process.exit(0);
} catch (error) {
  console.error('[seedKpiInsights] Fatal error:', error.message ?? error);
  process.exit(1);
}

function shiftDays(date, delta) {
  const clone = new Date(date);
  clone.setUTCDate(clone.getUTCDate() + delta);
  return clone;
}

async function buildSnapshot(companyId, start, end) {
  const [tasks, schedules, timeOff] = await Promise.all([
    fetchTasks(companyId, start, end),
    fetchSchedules(companyId, start, end),
    fetchTimeOff(companyId, start, end),
  ]);

  const scheduleIds = schedules.map((schedule) => schedule.id);
  const assignments = scheduleIds.length ? await fetchAssignments(scheduleIds) : [];

  return {
    attendance: computeAttendance(schedules, timeOff, start, end),
    coverage: computeCoverage(schedules, assignments),
    taskCompletion: computeTaskCompletion(tasks),
    resolutionHours: computeResolutionHours(tasks),
    sampleWindowDays: Math.max(1, Math.round((end - start) / MS_IN_DAY)),
  };
}

async function fetchTasks(companyId, start, end) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, status, created_at, completed_at, actual_hours')
    .eq('company_id', companyId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) throw error;
  return data ?? [];
}

async function fetchSchedules(companyId, start, end) {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, required_headcount, start_time, end_time')
    .eq('company_id', companyId)
    .gte('start_time', start.toISOString())
    .lt('start_time', end.toISOString());

  if (error) throw error;
  return data ?? [];
}

async function fetchAssignments(scheduleIds) {
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('schedule_id')
    .in('schedule_id', scheduleIds);

  if (error) throw error;
  return data ?? [];
}

async function fetchTimeOff(companyId, start, end) {
  const { data, error } = await supabase
    .from('time_off_requests')
    .select('id, start_date, end_date, status')
    .eq('company_id', companyId)
    .gte('end_date', start.toISOString())
    .lte('start_date', end.toISOString());

  if (error) throw error;
  return data ?? [];
}

function computeTaskCompletion(tasks) {
  if (!tasks.length) {
    return { ratio: 0, total: 0, completed: 0 };
  }

  const completedStatuses = new Set(['done', 'completed']);
  const completedTasks = tasks.filter((task) => completedStatuses.has((task.status ?? '').toLowerCase()));
  const ratio = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0;

  return {
    ratio: Number(ratio.toFixed(1)),
    total: tasks.length,
    completed: completedTasks.length,
  };
}

function computeResolutionHours(tasks) {
  const durations = tasks
    .filter((task) => Boolean(task.completed_at))
    .map((task) => {
      const created = new Date(task.created_at);
      const completed = new Date(task.completed_at);
      const diff = completed.getTime() - created.getTime();
      return diff > 0 ? diff / (60 * 60 * 1000) : 0;
    })
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!durations.length) {
    return { average: 0, sample: 0 };
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return {
    average: Number((total / durations.length).toFixed(2)),
    sample: durations.length,
  };
}

function computeCoverage(schedules, assignments) {
  if (!schedules.length) {
    return { percent: 0, required: 0, assignments: 0 };
  }

  const totalRequired = schedules.reduce((sum, schedule) => {
    const required = Number(schedule.required_headcount ?? 1);
    return sum + (Number.isFinite(required) ? required : 1);
  }, 0);
  const assignmentCount = assignments.length;
  const percent = totalRequired > 0 ? Math.min(100, (assignmentCount / totalRequired) * 100) : 0;

  return {
    percent: Number(percent.toFixed(1)),
    required: totalRequired,
    assignments: assignmentCount,
  };
}

function computeAttendance(schedules, timeOffRequests, start, end) {
  if (!schedules.length) {
    return { percent: 100, planned: 0, absences: 0 };
  }

  const totalShifts = schedules.length;
  const absenceDays = timeOffRequests.reduce((sum, request) => {
    const requestStart = request.start_date ? new Date(request.start_date) : null;
    const requestEnd = request.end_date ? new Date(request.end_date) : requestStart;
    if (!requestStart || !requestEnd) return sum;
    const overlap = computeOverlapDays(requestStart, requestEnd, start, end);
    return sum + overlap;
  }, 0);

  const assumedAbsences = Math.min(totalShifts, Math.round(absenceDays));
  const attendancePercent = totalShifts
    ? Math.max(0, ((totalShifts - assumedAbsences) / totalShifts) * 100)
    : 100;

  return {
    percent: Number(attendancePercent.toFixed(1)),
    planned: totalShifts,
    absences: assumedAbsences,
  };
}

function computeOverlapDays(rangeStart, rangeEnd, windowStart, windowEnd) {
  const start = Math.max(rangeStart.getTime(), windowStart.getTime());
  const end = Math.min(rangeEnd.getTime(), windowEnd.getTime());
  if (end <= start) return 0;
  return Math.max(1, Math.ceil((end - start) / MS_IN_DAY));
}

function buildMetrics(current, previous, timestamp) {
  const recordedAt = timestamp.toISOString();

  const metrics = [
    buildMetric({
      id: 'attendance-rate',
      label: 'Attendance Rate',
      unit: '%',
      direction: 'positive',
      currentValue: current.attendance.percent,
      previousValue: previous.attendance.percent,
      metadata: {
        window_days: current.sampleWindowDays,
        planned_shifts: current.attendance.planned,
        absences: current.attendance.absences,
      },
      recordedAt,
    }),
    buildMetric({
      id: 'task-completion',
      label: 'Task Completion',
      unit: '%',
      direction: 'positive',
      currentValue: current.taskCompletion.ratio,
      previousValue: previous.taskCompletion.ratio,
      metadata: {
        window_days: current.sampleWindowDays,
        total_tasks: current.taskCompletion.total,
        completed_tasks: current.taskCompletion.completed,
      },
      recordedAt,
    }),
    buildMetric({
      id: 'shift-coverage',
      label: 'Shift Coverage',
      unit: '%',
      direction: 'positive',
      currentValue: current.coverage.percent,
      previousValue: previous.coverage.percent,
      metadata: {
        window_days: current.sampleWindowDays,
        required_headcount: current.coverage.required,
        assignments: current.coverage.assignments,
      },
      recordedAt,
    }),
    buildMetric({
      id: 'issue-resolution',
      label: 'Issue Resolution Time',
      unit: 'hrs',
      direction: 'negative',
      currentValue: current.resolutionHours.average,
      previousValue: previous.resolutionHours.average,
      precision: 2,
      metadata: {
        window_days: current.sampleWindowDays,
        resolved_tasks: current.resolutionHours.sample,
      },
      recordedAt,
    }),
  ];

  return metrics.filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value));
}

function buildMetric({
  id,
  label,
  unit,
  direction,
  currentValue,
  previousValue,
  metadata,
  recordedAt,
  precision = unit === 'hrs' ? 2 : 1,
}) {
  const safeCurrent = Number.isFinite(currentValue) ? currentValue : 0;
  const safePrevious = Number.isFinite(previousValue) ? previousValue : 0;
  const deltaRaw = safeCurrent - safePrevious;
  const delta = Number(deltaRaw.toFixed(precision));
  const trend = determineTrend(deltaRaw, direction);

  return {
    id,
    label,
    unit,
    value: Number(safeCurrent.toFixed(precision)),
    delta,
    trend,
    metadata,
    recordedAt,
  };
}

function determineTrend(delta, direction = 'positive') {
  const normalizedDelta = direction === 'positive' ? delta : -delta;
  if (normalizedDelta > 0.5) return 'up';
  if (normalizedDelta < -0.5) return 'down';
  return 'flat';
}
