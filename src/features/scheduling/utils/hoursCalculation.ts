/**
 * Utility functions for hours and coverage calculations
 */

import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { AssignmentWithUser } from "@/features/scheduling/hooks/useSchedulingConsolidated";

export interface HoursSummary {
  totalHours: number;
  totalLaborHours: number;
  averageShiftHours: number;
  shiftCount: number;
  dailyHours: Record<string, number>;
  filledCount: number;
  partialCount: number;
  unfilledCount: number;
}

export interface CoveragePercentages {
  filledPct: number;
  partialPct: number;
  openPct: number;
}

/**
 * Calculate hours summary from shifts
 */
export function calculateHoursSummary(
  shifts: ShiftWithAssignments[],
  assignments: AssignmentWithUser[],
): HoursSummary {
  const dailyHours: Record<string, number> = {};
  let totalHours = 0;
  let totalLaborHours = 0;
  let filledCount = 0;
  let partialCount = 0;
  let unfilledCount = 0;

  shifts.forEach((shift) => {
    const start = shift.start_time ? new Date(shift.start_time) : null;
    const end = shift.end_time ? new Date(shift.end_time) : null;
    if (!start || !end) return;
    const diffMs = end.getTime() - start.getTime();
    if (Number.isNaN(diffMs) || diffMs <= 0) return;
    const hours = diffMs / 36e5;
    const headcount = shift.required_headcount ?? 1;
    const laborHours = hours * headcount;

    totalHours += hours;
    totalLaborHours += laborHours;

    const dayKey = start.toISOString().split("T")[0] ?? "unknown";
    dailyHours[dayKey] = (dailyHours[dayKey] ?? 0) + hours;

    const assignedCount = Array.isArray(shift.assignments)
      ? shift.assignments.length
      : assignments.filter((assignment) => assignment.schedule_id === shift.id)
          .length;

    if (assignedCount >= headcount) {
      filledCount += 1;
    } else if (assignedCount > 0) {
      partialCount += 1;
    } else {
      unfilledCount += 1;
    }
  });

  const shiftCount = shifts.length;
  const averageShiftHours = shiftCount > 0 ? totalHours / shiftCount : 0;

  return {
    totalHours,
    totalLaborHours,
    averageShiftHours,
    shiftCount,
    dailyHours,
    filledCount,
    partialCount,
    unfilledCount,
  };
}

/**
 * Calculate coverage percentages from hours summary
 */
export function calculateCoveragePercentages(
  summary: HoursSummary,
): CoveragePercentages {
  const total = summary.shiftCount || 1;
  const filledPct = (summary.filledCount / total) * 100;
  const partialPct = (summary.partialCount / total) * 100;
  const openPct = (summary.unfilledCount / total) * 100;
  return {
    filledPct,
    partialPct,
    openPct,
  };
}

export interface DailyGridStats {
  laborHours: number;
  shiftCount: number;
  filled: number;
  partial: number;
  open: number;
  coverageRatio: number;
}

function shiftHours(shift: ShiftWithAssignments): number {
  const start = shift.start_time ? new Date(shift.start_time) : null;
  const end = shift.end_time ? new Date(shift.end_time) : null;
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
  return diffMs / 36e5;
}

function assignedCount(shift: ShiftWithAssignments): number {
  return Array.isArray(shift.assignments) ? shift.assignments.length : 0;
}

/**
 * Per-day labor hours and coverage stats for grid footer rows.
 */
export function calculateDailyGridStats(
  shifts: ShiftWithAssignments[],
  weekDays: Date[],
): Map<string, DailyGridStats> {
  const dayIso = (day: Date) => day.toISOString().slice(0, 10);
  const stats = new Map<string, DailyGridStats>();

  for (const day of weekDays) {
    stats.set(dayIso(day), {
      laborHours: 0,
      shiftCount: 0,
      filled: 0,
      partial: 0,
      open: 0,
      coverageRatio: 1,
    });
  }

  for (const shift of shifts) {
    const start = shift.start_time ? new Date(shift.start_time) : null;
    if (!start) continue;
    const key = start.toISOString().slice(0, 10);
    const entry = stats.get(key);
    if (!entry) continue;

    const hours = shiftHours(shift);
    const headcount = shift.required_headcount ?? 1;
    entry.laborHours += hours * headcount;
    entry.shiftCount += 1;

    const assigned = assignedCount(shift);
    if (assigned >= headcount) {
      entry.filled += 1;
    } else if (assigned > 0) {
      entry.partial += 1;
    } else {
      entry.open += 1;
    }
  }

  for (const entry of stats.values()) {
    const total = entry.filled + entry.partial + entry.open;
    const weighted =
      entry.filled + entry.partial * 0.5;
    entry.coverageRatio = total > 0 ? weighted / total : 1;
    entry.laborHours = Math.round(entry.laborHours * 10) / 10;
  }

  return stats;
}
